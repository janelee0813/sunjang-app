'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function MeetingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [place, setPlace] = useState('');
  const [groupNotes, setGroupNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) { router.push('/login'); return; }
      setUserId(session.user.id);

      const { data: user } = await supabase
        .from('users').select('group_id').eq('id', session.user.id).single();
      if (!user?.group_id) { setLoading(false); return; }
      setGroupId(user.group_id);

      const { data: m } = await supabase
        .from('members').select('*')
        .eq('group_id', user.group_id)
        .in('member_status', ['active', 'care'])
        .order('name');

      const initialRows = (m ?? []).map((member: any) => ({
        member_id: member.id,
        member_name: member.name,
        worship_attended: false,
        department_attended: false,
        group_attended: false,
        prayer_request: '',
        special_notes: '',
        visitation_needed: false,
        pastor_feedback: '',
      }));

      setMembers(m ?? []);
      setRows(initialRows);
      setLoading(false);
    })();
  }, []);

  // 날짜 바뀌면 기존 기록 불러오기
  useEffect(() => {
    if (!groupId || !date) return;
    (async () => {
      const { data: meeting } = await supabase
        .from('meetings').select('*')
        .eq('group_id', groupId)
        .eq('meeting_date', date)
        .single();

      if (meeting) {
        setPlace(meeting.place ?? '');
        setGroupNotes(meeting.group_notes ?? '');
        setIsUrgent(meeting.is_urgent ?? false);

        const { data: recs } = await supabase
          .from('meeting_member_records').select('*')
          .eq('meeting_id', meeting.id);

        setRows(prev => prev.map(row => {
          const existing = (recs ?? []).find((r: any) => r.member_id === row.member_id);
          return existing ? {
            ...row,
            worship_attended: existing.worship_attended,
            department_attended: existing.department_attended,
            group_attended: existing.group_attended,
            prayer_request: existing.prayer_request ?? '',
            special_notes: existing.special_notes ?? '',
            visitation_needed: existing.visitation_needed,
            pastor_feedback: existing.pastor_feedback ?? '',
          } : row;
        }));
      } else {
        setPlace('');
        setGroupNotes('');
        setIsUrgent(false);
        setRows(prev => prev.map(row => ({
          ...row,
          worship_attended: false,
          department_attended: false,
          group_attended: false,
          prayer_request: '',
          special_notes: '',
          visitation_needed: false,
          pastor_feedback: '',
        })));
      }
    })();
  }, [date, groupId]);

  const updateRow = (idx: number, field: string, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const markAllPresent = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      worship_attended: true,
      department_attended: true,
      group_attended: true,
    })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const meetingPayload = {
        group_id: groupId,
        meeting_date: date,
        place,
        group_notes: groupNotes || null,
        is_urgent: isUrgent,
        created_by: userId,
      };

      const { data: existing } = await supabase
        .from('meetings').select('id')
        .eq('group_id', groupId)
        .eq('meeting_date', date)
        .single();

      let meetingId = existing?.id;

      if (meetingId) {
        await supabase.from('meetings').update(meetingPayload).eq('id', meetingId);
      } else {
        const { data: newM } = await supabase
          .from('meetings').insert(meetingPayload).select().single();
        meetingId = newM?.id;
      }

      if (!meetingId) throw new Error('저장 실패');

      const recordPayloads = rows.map(r => ({
        meeting_id: meetingId,
        member_id: r.member_id,
        worship_attended: r.worship_attended,
        department_attended: r.department_attended,
        group_attended: r.group_attended,
        prayer_request: r.prayer_request || null,
        special_notes: r.special_notes || null,
        visitation_needed: r.visitation_needed,
        pastor_feedback: r.pastor_feedback || null,
      }));

      await supabase
        .from('meeting_member_records')
        .upsert(recordPayloads, { onConflict: 'meeting_id,member_id' });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{padding:'2rem', color:'#6c757d'}}>불러오는 중...</div>;

  const chkStyle = (on: boolean, color: string) => ({
    width: '22px', height: '22px', borderRadius: '4px', border: `1px solid ${on ? color : '#dee2e6'}`,
    background: on ? color : 'white', color: 'white', cursor: 'pointer', fontSize: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
  });

  return (
    <div style={{padding:'2rem'}}>
      <h1 style={{fontSize:'18px', fontWeight:'500', marginBottom:'1.5rem'}}>주차 기록 입력</h1>

      {/* 헤더 */}
      <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', padding:'1.2rem', marginBottom:'16px'}}>
        <div style={{display:'grid', gridTemplateColumns:'160px 1fr 2fr auto', gap:'12px', alignItems:'end'}}>
          <div>
            <label style={{fontSize:'11px', color:'#6c757d', display:'block', marginBottom:'4px'}}>모임 날짜</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{width:'100%', padding:'8px 10px', border:'1px solid #dee2e6', borderRadius:'8px', fontSize:'13px'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px', color:'#6c757d', display:'block', marginBottom:'4px'}}>장소</label>
            <input type="text" value={place} onChange={e => setPlace(e.target.value)} placeholder="예: 교회 순모임실 B"
              style={{width:'100%', padding:'8px 10px', border:'1px solid #dee2e6', borderRadius:'8px', fontSize:'13px'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px', color:'#6c757d', display:'block', marginBottom:'4px'}}>순 특이사항</label>
            <input type="text" value={groupNotes} onChange={e => setGroupNotes(e.target.value)} placeholder="이번 주 공지사항"
              style={{width:'100%', padding:'8px 10px', border:'1px solid #dee2e6', borderRadius:'8px', fontSize:'13px'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px', color:'#6c757d', display:'block', marginBottom:'4px'}}>긴급</label>
            <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)}
              style={{width:'18px', height:'18px', cursor:'pointer'}}/>
          </div>
        </div>
      </div>

      {/* 기록 테이블 */}
      <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', overflow:'hidden'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid #e9ecef'}}>
          <span style={{fontSize:'13px', fontWeight:'500'}}>순원별 기록</span>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={markAllPresent}
              style={{padding:'6px 12px', border:'1px solid #dee2e6', borderRadius:'8px', fontSize:'12px', cursor:'pointer', background:'white'}}>
              전체 출석 처리
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{padding:'6px 16px', background: saving ? '#6c757d' : '#1a56db', color:'white', border:'none', borderRadius:'8px', fontSize:'12px', cursor:'pointer'}}>
              {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
            </button>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#f8f9fa'}}>
                <th style={{padding:'8px 12px', textAlign:'left', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef', whiteSpace:'nowrap'}}>이름</th>
                <th style={{padding:'8px 12px', textAlign:'center', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>예배</th>
                <th style={{padding:'8px 12px', textAlign:'center', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>부서</th>
                <th style={{padding:'8px 12px', textAlign:'center', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>순모임</th>
                <th style={{padding:'8px 12px', textAlign:'left', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef', minWidth:'160px'}}>기도제목</th>
                <th style={{padding:'8px 12px', textAlign:'left', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef', minWidth:'120px'}}>특이사항</th>
                <th style={{padding:'8px 12px', textAlign:'center', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>심방</th>
                <th style={{padding:'8px 12px', textAlign:'left', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef', minWidth:'140px'}}>교역자 피드백</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.member_id} style={{background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom:'1px solid #f1f3f5'}}>
                  <td style={{padding:'6px 12px', fontWeight:'500', whiteSpace:'nowrap'}}>{row.member_name}</td>
                  <td style={{padding:'6px 12px'}}>
                    <div style={chkStyle(row.worship_attended, '#1a56db')} onClick={() => updateRow(i, 'worship_attended', !row.worship_attended)}>
                      {row.worship_attended && '✓'}
                    </div>
                  </td>
                  <td style={{padding:'6px 12px'}}>
                    <div style={chkStyle(row.department_attended, '#1a56db')} onClick={() => updateRow(i, 'department_attended', !row.department_attended)}>
                      {row.department_attended && '✓'}
                    </div>
                  </td>
                  <td style={{padding:'6px 12px'}}>
                    <div style={chkStyle(row.group_attended, '#0f6e56')} onClick={() => updateRow(i, 'group_attended', !row.group_attended)}>
                      {row.group_attended && '✓'}
                    </div>
                  </td>
                  <td style={{padding:'4px 8px'}}>
                    <input type="text" value={row.prayer_request} onChange={e => updateRow(i, 'prayer_request', e.target.value)}
                      placeholder="기도제목..." style={{width:'100%', border:'none', background:'transparent', fontSize:'12px', padding:'4px'}}/>
                  </td>
                  <td style={{padding:'4px 8px'}}>
                    <input type="text" value={row.special_notes} onChange={e => updateRow(i, 'special_notes', e.target.value)}
                      placeholder="특이사항..." style={{width:'100%', border:'none', background:'transparent', fontSize:'12px', padding:'4px'}}/>
                  </td>
                  <td style={{padding:'6px 12px'}}>
                    <div style={chkStyle(row.visitation_needed, '#dc8a00')} onClick={() => updateRow(i, 'visitation_needed', !row.visitation_needed)}>
                      {row.visitation_needed && '✓'}
                    </div>
                  </td>
                  <td style={{padding:'4px 8px'}}>
                    <input type="text" value={row.pastor_feedback} onChange={e => updateRow(i, 'pastor_feedback', e.target.value)}
                      placeholder="피드백..." style={{width:'100%', border:'none', background:'transparent', fontSize:'12px', padding:'4px'}}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}