'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [member, setMember] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info'|'stats'|'timeline'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from('members').select('*').eq('id', id).single();
      if (!m) { router.push('/members'); return; }
      setMember(m);

      const { data: meetings } = await supabase
        .from('meetings').select('id, meeting_date')
        .eq('group_id', m.group_id)
        .order('meeting_date', { ascending: false });

      const { data: recs } = await supabase
        .from('meeting_member_records').select('*')
        .eq('member_id', id);

      const merged = (recs ?? []).map((r: any) => ({
        ...r,
        meeting_date: (meetings ?? []).find((mt: any) => mt.id === r.meeting_id)?.meeting_date ?? '',
      })).sort((a: any, b: any) => b.meeting_date.localeCompare(a.meeting_date));

      setRecords(merged);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div style={{padding:'2rem', color:'#6c757d'}}>불러오는 중...</div>;
  if (!member) return null;

  const age = member.birth_year ? new Date().getFullYear() - member.birth_year : null;
  const total = records.length;
  const worshipRate = total ? Math.round(records.filter(r => r.worship_attended).length / total * 100) : 0;
  const deptRate = total ? Math.round(records.filter(r => r.department_attended).length / total * 100) : 0;
  const groupRate = total ? Math.round(records.filter(r => r.group_attended).length / total * 100) : 0;

  let streak = 0;
  for (const r of records) {
    if (!r.group_attended) streak++;
    else break;
  }

  const statusLabel: Record<string,string> = { active:'활동중', care:'관리필요', inactive:'비활성', moved:'이동' };
  const statusColor: Record<string,string> = { active:'#198754', care:'#dc8a00', inactive:'#dc3545', moved:'#6c757d' };
  const statusBg: Record<string,string> = { active:'#d1e7dd', care:'#fff3cd', inactive:'#f8d7da', moved:'#e9ecef' };

  const tabStyle = (tab: string) => ({
    padding:'8px 16px', fontSize:'13px', cursor:'pointer', border:'none', background:'transparent',
    borderBottom: activeTab === tab ? '2px solid #1a56db' : '2px solid transparent',
    color: activeTab === tab ? '#1a56db' : '#6c757d', fontWeight: activeTab === tab ? '500' : '400',
  });

  const statCard = (label: string, value: string, rate?: number, danger?: boolean) => (
    <div style={{background:'#f8f9fa', borderRadius:'10px', padding:'1rem'}}>
      <p style={{fontSize:'11px', color:'#6c757d', margin:'0 0 6px'}}>{label}</p>
      <p style={{fontSize:'22px', fontWeight:'500', margin:'0', color: danger ? '#dc3545' : 'inherit'}}>{value}</p>
      {rate !== undefined && (
        <div style={{height:'4px', background:'#dee2e6', borderRadius:'2px', marginTop:'8px'}}>
          <div style={{height:'100%', width:`${rate}%`, background:'#1a56db', borderRadius:'2px'}}/>
        </div>
      )}
    </div>
  );

  return (
    <div style={{padding:'2rem', maxWidth:'860px'}}>
      <button onClick={() => router.push('/members')}
        style={{fontSize:'13px', color:'#6c757d', background:'none', border:'none', cursor:'pointer', marginBottom:'1rem', padding:'0'}}>
        ← 목록으로
      </button>

      {/* 헤더 */}
      <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'1.5rem'}}>
        <div style={{width:'52px', height:'52px', borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'500', color:'#1e40af', flexShrink:0}}>
          {member.name.slice(0,2)}
        </div>
        <div style={{flex:1}}>
          <h1 style={{fontSize:'20px', fontWeight:'500', margin:'0'}}>{member.name}</h1>
          <p style={{fontSize:'13px', color:'#6c757d', margin:'4px 0 0'}}>
            {member.gender}성 · {age ? `${age}세` : '-'} · {statusLabel[member.member_status] ?? member.member_status}
          </p>
          <div style={{display:'flex', gap:'6px', marginTop:'8px'}}>
            <span style={{fontSize:'11px', fontWeight:'500', padding:'2px 8px', borderRadius:'20px', background: statusBg[member.member_status], color: statusColor[member.member_status]}}>
              {statusLabel[member.member_status]}
            </span>
            {streak >= 3 && (
              <span style={{fontSize:'11px', fontWeight:'500', padding:'2px 8px', borderRadius:'20px', background:'#fff3cd', color:'#dc8a00'}}>
                심방 권장
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{display:'flex', borderBottom:'1px solid #e9ecef', marginBottom:'1.5rem'}}>
        <button style={tabStyle('info')} onClick={() => setActiveTab('info')}>개인정보</button>
        <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}>출석통계</button>
        <button style={tabStyle('timeline')} onClick={() => setActiveTab('timeline')}>기록 타임라인</button>
      </div>

      {/* 탭 1: 개인정보 */}
      {activeTab === 'info' && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
          <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem'}}>
            <h3 style={{fontSize:'13px', fontWeight:'500', margin:'0 0 14px'}}>기본 정보</h3>
            {[
              ['이름', member.name],
              ['성별', member.gender + '성'],
              ['생년', member.birth_year ? `${member.birth_year}년생 (${age}세)` : '-'],
              ['연락처', member.phone ? member.phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3') : '-'],
              ['주소', member.address ?? '-'],
              ['직업', member.job ?? '-'],
              ['등록일', member.joined_at ?? '-'],
            ].map(([label, value]) => (
              <div key={label} style={{display:'flex', gap:'12px', marginBottom:'10px'}}>
                <span style={{fontSize:'12px', color:'#6c757d', width:'60px', flexShrink:0}}>{label}</span>
                <span style={{fontSize:'13px'}}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem'}}>
            <h3 style={{fontSize:'13px', fontWeight:'500', margin:'0 0 14px'}}>목양 메모</h3>
            <p style={{fontSize:'13px', color:'#6c757d', lineHeight:'1.7', margin:'0'}}>{member.notes ?? '없음'}</p>
            <h3 style={{fontSize:'13px', fontWeight:'500', margin:'16px 0 10px'}}>가족 사항</h3>
            <p style={{fontSize:'13px', color:'#6c757d', lineHeight:'1.7', margin:'0'}}>{member.family_notes ?? '없음'}</p>
          </div>
        </div>
      )}

      {/* 탭 2: 출석통계 */}
      {activeTab === 'stats' && (
        <div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px'}}>
            {statCard('예배 출석률', `${worshipRate}%`, worshipRate)}
            {statCard('부서 출석률', `${deptRate}%`, deptRate)}
            {statCard('순모임 출석률', `${groupRate}%`, groupRate)}
            {statCard('연속 결석', `${streak}주`, undefined, streak >= 3)}
          </div>
          <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', overflow:'hidden'}}>
            <div style={{padding:'12px 16px', borderBottom:'1px solid #e9ecef'}}>
              <span style={{fontSize:'13px', fontWeight:'500'}}>주차별 출석 내역</span>
            </div>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#f8f9fa'}}>
                  {['날짜','예배','부서','순모임','기도제목','심방'].map(h => (
                    <th key={h} style={{padding:'8px 12px', textAlign: h==='날짜'||h==='기도제목' ? 'left' : 'center', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} style={{borderBottom:'1px solid #f1f3f5'}}>
                    <td style={{padding:'8px 12px', fontFamily:'monospace', fontSize:'12px'}}>{r.meeting_date}</td>
                    {[r.worship_attended, r.department_attended, r.group_attended].map((v, i) => (
                      <td key={i} style={{padding:'8px 12px', textAlign:'center', color: v ? '#0f6e56' : '#dc3545', fontWeight:'500'}}>{v ? 'O' : 'X'}</td>
                    ))}
                    <td style={{padding:'8px 12px', fontSize:'12px', color:'#6c757d'}}>{r.prayer_request ?? '-'}</td>
                    <td style={{padding:'8px 12px', textAlign:'center'}}>
                      {r.visitation_needed ? <span style={{fontSize:'11px', background:'#fff3cd', color:'#dc8a00', padding:'2px 6px', borderRadius:'10px'}}>필요</span> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 3: 타임라인 */}
      {activeTab === 'timeline' && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
          <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem'}}>
            <h3 style={{fontSize:'13px', fontWeight:'500', margin:'0 0 14px'}}>기록 타임라인</h3>
            <div style={{paddingLeft:'12px'}}>
              {records.map((r, i) => (
                <div key={r.id} style={{display:'flex', gap:'10px', marginBottom:'14px', position:'relative'}}>
                  {i < records.length - 1 && <div style={{position:'absolute', left:'-8px', top:'10px', bottom:'-14px', width:'1px', background:'#e9ecef'}}/>}
                  <div style={{width:'10px', height:'10px', borderRadius:'50%', background: r.group_attended ? '#0f6e56' : '#dc3545', flexShrink:0, marginTop:'3px', border:'2px solid white', boxShadow:'0 0 0 1px #dee2e6'}}/>
                  <div>
                    <p style={{fontSize:'11px', color:'#6c757d', margin:'0'}}>{r.meeting_date}</p>
                    <p style={{fontSize:'12px', margin:'2px 0 0'}}>
                      예배 {r.worship_attended?'✓':'✗'} · 부서 {r.department_attended?'✓':'✗'} · 순모임 {r.group_attended?'✓':'✗'}
                      {r.special_notes && ` · ${r.special_notes}`}
                    </p>
                    {r.prayer_request && <p style={{fontSize:'11px', color:'#6c757d', margin:'2px 0 0', fontStyle:'italic'}}>"{r.prayer_request}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem'}}>
            <h3 style={{fontSize:'13px', fontWeight:'500', margin:'0 0 14px'}}>기도제목 히스토리</h3>
            {records.filter(r => r.prayer_request).length === 0 ? (
              <p style={{fontSize:'13px', color:'#6c757d'}}>기록된 기도제목이 없습니다.</p>
            ) : (
              records.filter(r => r.prayer_request).map(r => (
                <div key={r.id} style={{borderBottom:'1px solid #f1f3f5', paddingBottom:'10px', marginBottom:'10px'}}>
                  <p style={{fontSize:'11px', color:'#6c757d', margin:'0'}}>{r.meeting_date}</p>
                  <p style={{fontSize:'13px', margin:'3px 0 0'}}>{r.prayer_request}</p>
                  {r.pastor_feedback && <p style={{fontSize:'12px', color:'#1a56db', margin:'3px 0 0'}}>💬 {r.pastor_feedback}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}