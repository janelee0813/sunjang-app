'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function StatsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
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
        .neq('member_status', 'removed')
        .neq('member_status', 'lineout')
        .order('name');

      const memberIds = (m ?? []).map((mem: any) => mem.id);
      const { data: r } = memberIds.length > 0
        ? await supabase.from('meeting_member_records').select('*').in('member_id', memberIds)
        : { data: [] };

      setMembers(m ?? []);
      setRecords(r ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:'2rem',color:'#6c757d'}}>불러오는 중...</div>;

  const getMemberStats = (memberId: string) => {
    const recs = records.filter(r => r.member_id === memberId);
    const total = recs.length;
    if (total === 0) return {total:0,worship:0,dept:0,group:0,worshipRate:0,deptRate:0,groupRate:0,streak:0};
    const worship = recs.filter(r => r.worship_attended).length;
    const dept = recs.filter(r => r.department_attended).length;
    const group = recs.filter(r => r.group_attended).length;
    const sorted = [...recs].sort((a,b) => b.meeting_date > a.meeting_date ? 1 : -1);
    let streak = 0;
    for (const r of sorted) { if (!r.group_attended) streak++; else break; }
    return {total,worship,dept,group,worshipRate:Math.round(worship/total*100),deptRate:Math.round(dept/total*100),groupRate:Math.round(group/total*100),streak};
  };

  const statusLabel: Record<string,string> = {active:'활동중',care:'관리필요',inactive:'장기불참',lineout:'라인아웃'};
  const statusColor: Record<string,string> = {active:'#198754',care:'#dc8a00',inactive:'#6c757d',lineout:'#7c3aed'};
  const statusBg: Record<string,string> = {active:'#d1e7dd',care:'#fff3cd',inactive:'#e9ecef',lineout:'#ede9fe'};
  const allStats = members.map(m => ({...m, stats: getMemberStats(m.id)}));
  const avgWorship = Math.round(allStats.reduce((s,m) => s+m.stats.worshipRate,0)/(allStats.length||1));
  const avgGroup = Math.round(allStats.reduce((s,m) => s+m.stats.groupRate,0)/(allStats.length||1));
  const visitNeeded = allStats.filter(m => m.stats.streak >= 3).length;

  return (
    <div style={{padding:'2rem',maxWidth:'1000px'}}>
      <h1 style={{fontSize:'18px',fontWeight:'500',marginBottom:'1.5rem'}}>통계 / 보고</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'2rem'}}>
        {[{label:'총 순원 수',value:`${members.length}명`},{label:'평균 예배 출석률',value:`${avgWorship}%`},{label:'평균 순모임 출석률',value:`${avgGroup}%`},{label:'심방 권장 인원',value:`${visitNeeded}명`,danger:visitNeeded>0}].map(item => (
          <div key={item.label} style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem 1.2rem'}}>
            <p style={{fontSize:'11px',color:'#6c757d',margin:'0 0 6px'}}>{item.label}</p>
            <p style={{fontSize:'22px',fontWeight:'500',margin:'0',color:item.danger?'#dc8a00':'inherit'}}>{item.value}</p>
          </div>
        ))}
      </div>
      <div style={{background:'white',border:'1px solid #e9ecef',borderRadius:'12px',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #e9ecef'}}>
          <span style={{fontSize:'13px',fontWeight:'500'}}>전체 순원 출석통계</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#f8f9fa'}}>
                {['이름','상태','총 기록','예배 횟수','예배 출석률','부서 출석률','순모임 출석률','연속 결석'].map(h => (
                  <th key={h} style={{padding:'8px 12px',textAlign:h==='이름'||h==='상태'?'left':'center',fontSize:'11px',color:'#6c757d',fontWeight:'500',borderBottom:'1px solid #e9ecef',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStats.map(m => {
                const s = m.stats;
                const rateColor = (r: number) => r>=80?'#0f6e56':r>=60?'#dc8a00':'#dc3545';
                return (
                  <tr key={m.id} onClick={() => router.push(`/members/${m.id}`)} style={{borderBottom:'1px solid #f1f3f5',cursor:'pointer'}} onMouseEnter={e=>(e.currentTarget.style.background='#f8f9fa')} onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                    <td style={{padding:'10px 12px',fontWeight:'500'}}>{m.name}</td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{fontSize:'11px',fontWeight:'500',padding:'2px 8px',borderRadius:'20px',background:statusBg[m.member_status],color:statusColor[m.member_status]}}>{statusLabel[m.member_status]}</span>
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:'#6c757d'}}>{s.total}주</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:'#6c757d'}}>{s.worship}회</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:'500',color:rateColor(s.worshipRate)}}>{s.worshipRate}%</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:'500',color:rateColor(s.deptRate)}}>{s.deptRate}%</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:'500',color:rateColor(s.groupRate)}}>{s.groupRate}%</td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}>
                      {s.streak>0?<span style={{fontSize:'11px',background:'#f8d7da',color:'#dc3545',padding:'2px 8px',borderRadius:'10px',fontWeight:'500'}}>{s.streak}주</span>:<span style={{color:'#6c757d'}}>-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
