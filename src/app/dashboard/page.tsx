'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [latestRecords, setLatestRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) { router.push('/login'); return; }

      const { data: user } = await supabase
        .from('users').select('group_id').eq('id', session.user.id).single();
      if (!user?.group_id) { setLoading(false); return; }

      const { data: m } = await supabase
        .from('members').select('*')
        .eq('group_id', user.group_id)
        .neq('member_status', 'removed');

      const { data: mt } = await supabase
        .from('meetings').select('*')
        .eq('group_id', user.group_id)
        .order('meeting_date', { ascending: false })
        .limit(1);

      if (mt && mt.length > 0) {
        const { data: r } = await supabase
          .from('meeting_member_records').select('*')
          .eq('meeting_id', mt[0].id);
        setLatestRecords(r ?? []);
      }

      const { data: allR } = await supabase
        .from('meeting_member_records').select('*');
      setRecords(allR ?? []);
      setMembers(m ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:'2rem',color:'#6c757d'}}>불러오는 중...</div>;

  const activeMembers = members.filter(m => m.member_status === 'active' || m.member_status === 'care');
  const worshipRate = latestRecords.length ? Math.round(latestRecords.filter(r => r.worship_attended).length / latestRecords.length * 100) : 0;
  const groupRate = latestRecords.length ? Math.round(latestRecords.filter(r => r.group_attended).length / latestRecords.length * 100) : 0;
  const visitCount = records.filter(r => r.visitation_needed).length;
  const prayers = records.filter(r => r.prayer_request).slice(0, 3);

  return (
    <div style={{padding:'2rem', maxWidth:'900px'}}>
      <h1 style={{fontSize:'18px', fontWeight:'500', marginBottom:'1.5rem'}}>대시보드</h1>

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'2rem'}}>
        <div style={{background:'#f8f9fa', borderRadius:'10px', padding:'1rem 1.2rem'}}>
          <p style={{fontSize:'11px', color:'#6c757d', margin:'0 0 6px'}}>총 순원 수</p>
          <p style={{fontSize:'24px', fontWeight:'500', margin:'0'}}>{members.length}</p>
          <p style={{fontSize:'11px', color:'#198754', margin:'4px 0 0'}}>활동중 {activeMembers.length}명</p>
        </div>
        <div style={{background:'#f8f9fa', borderRadius:'10px', padding:'1rem 1.2rem'}}>
          <p style={{fontSize:'11px', color:'#6c757d', margin:'0 0 6px'}}>이번 주 예배 출석률</p>
          <p style={{fontSize:'24px', fontWeight:'500', margin:'0'}}>{worshipRate}%</p>
          <div style={{height:'4px', background:'#dee2e6', borderRadius:'2px', marginTop:'8px'}}>
            <div style={{height:'100%', width:`${worshipRate}%`, background:'#1a56db', borderRadius:'2px'}}/>
          </div>
        </div>
        <div style={{background:'#f8f9fa', borderRadius:'10px', padding:'1rem 1.2rem'}}>
          <p style={{fontSize:'11px', color:'#6c757d', margin:'0 0 6px'}}>이번 주 순모임 출석률</p>
          <p style={{fontSize:'24px', fontWeight:'500', margin:'0'}}>{groupRate}%</p>
          <div style={{height:'4px', background:'#dee2e6', borderRadius:'2px', marginTop:'8px'}}>
            <div style={{height:'100%', width:`${groupRate}%`, background:'#0f6e56', borderRadius:'2px'}}/>
          </div>
        </div>
        <div style={{background:'#f8f9fa', borderRadius:'10px', padding:'1rem 1.2rem'}}>
          <p style={{fontSize:'11px', color:'#6c757d', margin:'0 0 6px'}}>심방 필요 인원</p>
          <p style={{fontSize:'24px', fontWeight:'500', margin:'0', color: visitCount > 0 ? '#dc8a00' : 'inherit'}}>{visitCount}</p>
          <p style={{fontSize:'11px', color:'#6c757d', margin:'4px 0 0'}}>체크된 인원</p>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
        <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem'}}>
          <h3 style={{fontSize:'13px', fontWeight:'500', margin:'0 0 12px'}}>최근 순모임 출석 현황</h3>
          {activeMembers.length === 0 ? (
            <p style={{fontSize:'13px', color:'#6c757d'}}>데이터가 없습니다.</p>
          ) : (
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left', padding:'6px 8px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #f1f3f5'}}>이름</th>
                  <th style={{textAlign:'center', padding:'6px 8px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #f1f3f5'}}>예배</th>
                  <th style={{textAlign:'center', padding:'6px 8px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #f1f3f5'}}>부서</th>
                  <th style={{textAlign:'center', padding:'6px 8px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #f1f3f5'}}>순모임</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map(m => {
                  const rec = latestRecords.find(r => r.member_id === m.id);
                  return (
                    <tr key={m.id}>
                      <td style={{padding:'7px 8px', borderBottom:'1px solid #f8f9fa'}}>{m.name}</td>
                      <td style={{padding:'7px 8px', textAlign:'center', borderBottom:'1px solid #f8f9fa', color: rec?.worship_attended ? '#0f6e56' : '#dc3545', fontWeight:'500'}}>
                        {rec ? (rec.worship_attended ? 'O' : 'X') : '-'}
                      </td>
                      <td style={{padding:'7px 8px', textAlign:'center', borderBottom:'1px solid #f8f9fa', color: rec?.department_attended ? '#0f6e56' : '#dc3545', fontWeight:'500'}}>
                        {rec ? (rec.department_attended ? 'O' : 'X') : '-'}
                      </td>
                      <td style={{padding:'7px 8px', textAlign:'center', borderBottom:'1px solid #f8f9fa', color: rec?.group_attended ? '#0f6e56' : '#dc3545', fontWeight:'500'}}>
                        {rec ? (rec.group_attended ? 'O' : 'X') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem'}}>
          <h3 style={{fontSize:'13px', fontWeight:'500', margin:'0 0 12px'}}>최근 기도제목</h3>
          {prayers.length === 0 ? (
            <p style={{fontSize:'13px', color:'#6c757d'}}>등록된 기도제목이 없습니다.</p>
          ) : (
            prayers.map(r => {
              const member = members.find(m => m.id === r.member_id);
              return (
                <div key={r.id} style={{borderBottom:'1px solid #f1f3f5', paddingBottom:'10px', marginBottom:'10px'}}>
                  <p style={{fontSize:'12px', fontWeight:'500', margin:'0 0 3px'}}>{member?.name ?? '-'}</p>
                  <p style={{fontSize:'12px', color:'#6c757d', margin:'0'}}>{r.prayer_request}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}