'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const YEAR = 2026;

function getSundaysInQuarter(quarter: number): string[] {
  const startMonth = (quarter - 1) * 3;
  const sundays: string[] = [];
  let d = new Date(YEAR, startMonth, 1);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  const endDate = new Date(YEAR, startMonth + 3, 0);
  while (d <= endDate) {
    sundays.push(
      `${YEAR}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
    d = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return sundays;
}

function getDefaultDate(): string {
  const today = new Date();
  const s = new Date(today);
  s.setDate(today.getDate() - today.getDay());
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

function dateToQuarter(dateStr: string): number {
  return Math.ceil(parseInt(dateStr.slice(5, 7)) / 3);
}

function fmtTab(dateStr: string): string {
  return `${parseInt(dateStr.slice(5, 7))}/${parseInt(dateStr.slice(8, 10))}`;
}

export default function MeetingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const defaultDate = getDefaultDate();
  const [quarter, setQuarter] = useState<number>(() => dateToQuarter(defaultDate));
  const [sundays, setSundays] = useState<string[]>([]);
  const [date, setDate] = useState(defaultDate);

  const [members, setMembers] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState('');
  const [groupNotes, setGroupNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [pastorFeedback, setPastorFeedback] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const dateTabsRef = useRef<HTMLDivElement>(null);

  // 순원 목록 및 인증 초기 로드
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
        .in('member_status', ['active', 'care', 'inactive'])
        .order('is_leader', { ascending: false })
        .order('name');

      const initialRows = (m ?? []).map((member: any) => ({
        member_id: member.id,
        member_name: member.name,
        is_leader: member.is_leader ?? false,
        worship_attended: false,
        department_attended: false,
        group_attended: false,
        prayer_request: '',
        special_notes: '',
        visitation_needed: false,
      }));

      setMembers(m ?? []);
      setRows(initialRows);
      setLoading(false);
    })();
  }, []);

  // 분기 변경 시 일요일 목록 갱신
  useEffect(() => {
    setSundays(getSundaysInQuarter(quarter));
  }, [quarter]);

  // 활성 탭 스크롤
  useEffect(() => {
    if (!dateTabsRef.current) return;
    const el = dateTabsRef.current.querySelector('[data-active="true"]') as HTMLElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [date, sundays]);

  // 날짜 변경 시 해당 주 기록 불러오기
  useEffect(() => {
    if (!groupId || !date) return;
    (async () => {
      const { data: meeting } = await supabase
        .from('meetings').select('*')
        .eq('group_id', groupId).eq('meeting_date', date).single();

      if (meeting) {
        setGroupNotes(meeting.group_notes ?? '');
        setIsUrgent(meeting.is_urgent ?? false);
        setPastorFeedback(meeting.pastor_feedback ?? '');

        const { data: recs } = await supabase
          .from('meeting_member_records').select('*')
          .eq('meeting_id', meeting.id);

        setRows(prev => prev.map(row => {
          const ex = (recs ?? []).find((r: any) => r.member_id === row.member_id);
          return ex ? {
            ...row,
            worship_attended: ex.worship_attended,
            department_attended: ex.department_attended,
            group_attended: ex.group_attended,
            prayer_request: ex.prayer_request ?? '',
            special_notes: ex.special_notes ?? '',
            visitation_needed: ex.visitation_needed,
          } : { ...row, worship_attended: false, department_attended: false, group_attended: false, prayer_request: '', special_notes: '', visitation_needed: false };
        }));

      } else {
        setGroupNotes('');
        setIsUrgent(false);
        setPastorFeedback('');
        setRows(prev => prev.map(row => ({
          ...row,
          worship_attended: false,
          department_attended: false,
          group_attended: false,
          prayer_request: '',
          special_notes: '',
          visitation_needed: false,
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
      ...r, worship_attended: true, department_attended: true, group_attended: true,
    })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const meetingPayload: any = {
        group_id: groupId,
        meeting_date: date,
        place: '',
        group_notes: groupNotes || null,
        is_urgent: isUrgent,
        created_by: userId,
      };

      const { data: existing } = await supabase
        .from('meetings').select('id')
        .eq('group_id', groupId).eq('meeting_date', date).single();

      let meetingId = existing?.id;

      if (meetingId) {
        await supabase.from('meetings').update(meetingPayload).eq('id', meetingId);
      } else {
        const { data: newM } = await supabase
          .from('meetings').insert(meetingPayload).select().single();
        meetingId = newM?.id;
      }
      if (!meetingId) throw new Error('저장 실패');

      // 교역자 피드백 별도 저장 (컬럼 없으면 무시)
      try {
        await supabase.from('meetings')
          .update({ pastor_feedback: pastorFeedback || null })
          .eq('id', meetingId);
      } catch (_) {}

      const recordPayloads = rows.map(r => ({
        meeting_id: meetingId,
        member_id: r.member_id,
        worship_attended: r.worship_attended,
        department_attended: r.department_attended,
        group_attended: r.group_attended,
        prayer_request: r.prayer_request || null,
        special_notes: r.special_notes || null,
        visitation_needed: r.visitation_needed,
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

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>불러오는 중...</div>;

  const chkStyle = (on: boolean, color: string): React.CSSProperties => ({
    width: '24px', height: '24px', borderRadius: '6px',
    border: `1.5px solid ${on ? color : '#dee2e6'}`,
    background: on ? color : 'white', color: 'white', cursor: 'pointer', fontSize: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
    flexShrink: 0,
  });

  const quarterBtnStyle = (q: number): React.CSSProperties => ({
    flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: quarter === q ? '600' : '400',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    background: quarter === q ? '#1a56db' : 'transparent',
    color: quarter === q ? 'white' : '#6c757d',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem' }}>주차 기록 입력</h1>

      {/* 분기 탭 */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f3f5', borderRadius: '10px', padding: '4px', marginBottom: '12px' }}>
        {[1, 2, 3, 4].map(q => (
          <button key={q} style={quarterBtnStyle(q)} onClick={() => setQuarter(q)}>
            {q}분기
          </button>
        ))}
      </div>

      {/* 일요일 날짜 탭 */}
      <div
        ref={dateTabsRef}
        style={{
          display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px',
          scrollbarWidth: 'thin',
        }}
      >
        {sundays.map(s => {
          const isActive = s === date;
          return (
            <button
              key={s}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => setDate(s)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
                fontWeight: isActive ? '600' : '400',
                border: isActive ? '1.5px solid #1a56db' : '1px solid #dee2e6',
                background: isActive ? '#eff6ff' : 'white',
                color: isActive ? '#1a56db' : '#6c757d',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {fmtTab(s)}
            </button>
          );
        })}
      </div>

      {/* 모임 정보 헤더 */}
      <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginBottom: '4px', textAlign: 'left' }}>
              순 특이사항
            </label>
            <textarea
              value={groupNotes}
              onChange={e => setGroupNotes(e.target.value)}
              placeholder="이번 주 공지사항, 특이사항을 입력하세요..."
              rows={6}
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
                borderRadius: '8px', fontSize: '13px', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: '1.6', textAlign: 'left',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ paddingTop: '20px' }}>
            <label style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginBottom: '6px' }}>긴급</label>
            <input
              type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* 순원별 기록 테이블 */}
      <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '13px', fontWeight: '500' }}>순원별 기록</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={markAllPresent}
              style={{ padding: '6px 12px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'white' }}>
              전체 출석 처리
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '6px 16px', background: saving ? '#6c757d' : '#1a56db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {[
                  { label: '이름', w: '80px', align: 'left' },
                  { label: '예배', w: '50px', align: 'center' },
                  { label: '부서', w: '50px', align: 'center' },
                  { label: '순모임', w: '60px', align: 'center' },
                  { label: '기도제목', w: '220px', align: 'left' },
                  { label: '특이사항', w: '180px', align: 'left' },
                  { label: '심방', w: '50px', align: 'center' },
                ].map(h => (
                  <th key={h.label} style={{
                    padding: '8px 10px', textAlign: h.align as any, fontSize: '11px',
                    color: '#6c757d', fontWeight: '500', borderBottom: '1px solid #e9ecef',
                    minWidth: h.w, whiteSpace: 'nowrap',
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.member_id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f3f5', verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 10px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {row.is_leader && (
                      <span style={{ fontSize: '10px', background: '#1a56db', color: 'white', borderRadius: '4px', padding: '1px 5px', marginRight: '5px', fontWeight: '600' }}>순장</span>
                    )}
                    {row.member_name}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={chkStyle(row.worship_attended, '#1a56db')} onClick={() => updateRow(i, 'worship_attended', !row.worship_attended)}>
                      {row.worship_attended && '✓'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={chkStyle(row.department_attended, '#1a56db')} onClick={() => updateRow(i, 'department_attended', !row.department_attended)}>
                      {row.department_attended && '✓'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={chkStyle(row.group_attended, '#0f6e56')} onClick={() => updateRow(i, 'group_attended', !row.group_attended)}>
                      {row.group_attended && '✓'}
                    </div>
                  </td>
                  <td style={{ padding: '6px 8px', minWidth: '220px' }}>
                    <textarea
                      value={row.prayer_request}
                      onChange={e => updateRow(i, 'prayer_request', e.target.value)}
                      placeholder="기도제목..."
                      rows={5}
                      style={{
                        width: '100%', border: '1px solid #e9ecef', borderRadius: '6px',
                        fontSize: '12px', padding: '6px 8px', resize: 'vertical',
                        fontFamily: 'inherit', lineHeight: '1.5', boxSizing: 'border-box',
                        background: 'transparent',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', minWidth: '180px' }}>
                    <textarea
                      value={row.special_notes}
                      onChange={e => updateRow(i, 'special_notes', e.target.value)}
                      placeholder="특이사항..."
                      rows={5}
                      style={{
                        width: '100%', border: '1px solid #e9ecef', borderRadius: '6px',
                        fontSize: '12px', padding: '6px 8px', resize: 'vertical',
                        fontFamily: 'inherit', lineHeight: '1.5', boxSizing: 'border-box',
                        background: 'transparent',
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={chkStyle(row.visitation_needed, '#dc8a00')} onClick={() => updateRow(i, 'visitation_needed', !row.visitation_needed)}>
                      {row.visitation_needed && '✓'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 교역자 피드백 (순 전체에 대한 피드백) */}
      <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 10px', color: '#1a56db' }}>
          교역자 피드백 <span style={{ fontSize: '11px', color: '#6c757d', fontWeight: '400' }}>(순장에게 전달하는 피드백)</span>
        </h3>
        <textarea
          value={pastorFeedback}
          onChange={e => setPastorFeedback(e.target.value)}
          placeholder="교역자 피드백을 입력하세요..."
          rows={10}
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid #dee2e6',
            borderRadius: '8px', fontSize: '13px', resize: 'vertical',
            fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
