'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// 지난 일요일 날짜 계산 (주차 기록과 동일한 로직)
function getLastSunday(): string {
  const today = new Date();
  const s = new Date(today);
  s.setDate(today.getDate() - today.getDay());
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [latestRecords, setLatestRecords] = useState<any[]>([]);
  const [lastSundayDate, setLastSundayDate] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);

  // 중요일정
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) { router.push('/login'); return; }

      const { data: user } = await supabase
        .from('users').select('group_id').eq('id', session.user.id).single();
      if (!user?.group_id) { setLoading(false); return; }
      setGroupId(user.group_id);

      const { data: m } = await supabase
        .from('members').select('*')
        .eq('group_id', user.group_id)
        .neq('member_status', 'removed')
        .neq('member_status', 'lineout');

      // 순원 ID 목록
      const memberIds = (m ?? []).map((mem: any) => mem.id);

      // 지난 일요일 날짜로 해당 주 모임 조회
      const lastSunday = getLastSunday();
      setLastSundayDate(lastSunday);

      const { data: lastMeeting } = await supabase
        .from('meetings').select('*')
        .eq('group_id', user.group_id)
        .eq('meeting_date', lastSunday)
        .maybeSingle();

      if (lastMeeting && memberIds.length > 0) {
        const { data: r } = await supabase
          .from('meeting_member_records').select('*')
          .eq('meeting_id', lastMeeting.id)
          .in('member_id', memberIds);
        setLatestRecords(r ?? []);
      }

      // 현재 그룹 순원의 기록만 조회
      const { data: allR } = memberIds.length > 0
        ? await supabase.from('meeting_member_records').select('*').in('member_id', memberIds)
        : { data: [] };
      setRecords(allR ?? []);
      setMembers(m ?? []);

      // 중요일정 로드 (테이블 없으면 무시)
      try {
        const { data: ev } = await supabase
          .from('group_events').select('*')
          .eq('group_id', user.group_id)
          .order('created_at', { ascending: false });
        setEvents(ev ?? []);
      } catch (_) {}

      setLoading(false);
    })();
  }, []);

  const handleAddEvent = async () => {
    if (!newEvent.trim() || !groupId) return;
    setAddingEvent(true);
    try {
      const { data } = await supabase.from('group_events').insert({
        group_id: groupId,
        title: newEvent.trim(),
        event_date: newEventDate || null,
      }).select().single();
      if (data) setEvents(prev => [data, ...prev]);
      setNewEvent('');
      setNewEventDate('');
    } catch (_) {}
    setAddingEvent(false);
  };

  const handleDeleteEvent = async (id: string) => {
    await supabase.from('group_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>불러오는 중...</div>;

  const activeMembers = members.filter(m => m.member_status === 'active' || m.member_status === 'care');
  const worshipRate = latestRecords.length
    ? Math.round(latestRecords.filter(r => r.worship_attended).length / latestRecords.length * 100) : 0;
  const groupRate = latestRecords.length
    ? Math.round(latestRecords.filter(r => r.group_attended).length / latestRecords.length * 100) : 0;
  const visitCount = records.filter(r => r.visitation_needed).length;
  const prayers = records.filter(r => r.prayer_request).slice(0, 3);

  // 생일 계산 (이번달 + 다음달)
  const today = new Date();
  const thisMonth = today.getMonth() + 1;
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;

  const birthdayMembers = members.filter(m => {
    if (!m.birth_month) return false;
    return m.birth_month === thisMonth || m.birth_month === nextMonth;
  }).sort((a, b) => {
    const aMonth = a.birth_month === thisMonth ? 0 : 1;
    const bMonth = b.birth_month === thisMonth ? 0 : 1;
    if (aMonth !== bMonth) return aMonth - bMonth;
    return (a.birth_day ?? 0) - (b.birth_day ?? 0);
  });

  const formatBirthday = (m: any) => {
    if (!m.birth_month || !m.birth_day) return `${m.birth_month}월`;
    return `${m.birth_month}/${m.birth_day}`;
  };

  const isBirthdaySoon = (m: any) => {
    if (!m.birth_month || !m.birth_day) return false;
    const bDate = new Date(today.getFullYear(), m.birth_month - 1, m.birth_day);
    const diff = bDate.getTime() - today.getTime();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '960px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem' }}>대시보드</h1>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '2rem' }}>
        <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '1rem 1.2rem' }}>
          <p style={{ fontSize: '11px', color: '#6c757d', margin: '0 0 6px' }}>총 순원 수</p>
          <p style={{ fontSize: '24px', fontWeight: '500', margin: '0' }}>{members.length}</p>
          <p style={{ fontSize: '11px', color: '#198754', margin: '4px 0 0' }}>활동중 {activeMembers.length}명</p>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '1rem 1.2rem' }}>
          <p style={{ fontSize: '11px', color: '#6c757d', margin: '0 0 6px' }}>지난주 예배 출석률</p>
          <p style={{ fontSize: '24px', fontWeight: '500', margin: '0' }}>{worshipRate}%</p>
          <div style={{ height: '4px', background: '#dee2e6', borderRadius: '2px', marginTop: '8px' }}>
            <div style={{ height: '100%', width: `${worshipRate}%`, background: '#1a56db', borderRadius: '2px' }} />
          </div>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '1rem 1.2rem' }}>
          <p style={{ fontSize: '11px', color: '#6c757d', margin: '0 0 6px' }}>지난주 순모임 출석률</p>
          <p style={{ fontSize: '24px', fontWeight: '500', margin: '0' }}>{groupRate}%</p>
          <div style={{ height: '4px', background: '#dee2e6', borderRadius: '2px', marginTop: '8px' }}>
            <div style={{ height: '100%', width: `${groupRate}%`, background: '#0f6e56', borderRadius: '2px' }} />
          </div>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '1rem 1.2rem' }}>
          <p style={{ fontSize: '11px', color: '#6c757d', margin: '0 0 6px' }}>심방 필요 인원</p>
          <p style={{ fontSize: '24px', fontWeight: '500', margin: '0', color: visitCount > 0 ? '#dc8a00' : 'inherit' }}>{visitCount}</p>
          <p style={{ fontSize: '11px', color: '#6c757d', margin: '4px 0 0' }}>체크된 인원</p>
        </div>
      </div>

      {/* 2열 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* 최근 출석 현황 */}
        <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px' }}>
            지난주 순모임 출석 현황
            {lastSundayDate && (
              <span style={{ fontSize: '11px', color: '#6c757d', fontWeight: '400', marginLeft: '6px' }}>
                ({parseInt(lastSundayDate.slice(5,7))}/{parseInt(lastSundayDate.slice(8,10))})
              </span>
            )}
          </h3>
          {activeMembers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6c757d' }}>데이터가 없습니다.</p>
          ) : latestRecords.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6c757d' }}>
              {lastSundayDate}에 저장된 기록이 없습니다.<br/>
              <span style={{ fontSize: '12px' }}>주차 기록 메뉴에서 해당 날짜 기록을 저장해주세요.</span>
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['이름', '예배', '부서', '순모임'].map(h => (
                    <th key={h} style={{ textAlign: h === '이름' ? 'left' : 'center', padding: '6px 8px', fontSize: '11px', color: '#6c757d', fontWeight: '500', borderBottom: '1px solid #f1f3f5' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeMembers.map(m => {
                  const rec = latestRecords.find(r => r.member_id === m.id);
                  return (
                    <tr key={m.id}>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8f9fa' }}>{m.name}</td>
                      {[rec?.worship_attended, rec?.department_attended, rec?.group_attended].map((v, i) => (
                        <td key={i} style={{ padding: '7px 8px', textAlign: 'center', borderBottom: '1px solid #f8f9fa', color: v ? '#0f6e56' : '#dc3545', fontWeight: '500' }}>
                          {rec ? (v ? 'O' : 'X') : '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 기도제목 */}
        <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px' }}>최근 기도제목</h3>
          {prayers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6c757d' }}>등록된 기도제목이 없습니다.</p>
          ) : (
            prayers.map(r => {
              const member = members.find(m => m.id === r.member_id);
              return (
                <div key={r.id} style={{ borderBottom: '1px solid #f1f3f5', paddingBottom: '10px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '500', margin: '0 0 3px' }}>{member?.name ?? '-'}</p>
                  <p style={{ fontSize: '12px', color: '#6c757d', margin: '0' }}>{r.prayer_request}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 생일 + 중요일정 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* 생일 */}
        <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px' }}>
            생일 안내
            <span style={{ fontSize: '11px', color: '#6c757d', fontWeight: '400', marginLeft: '6px' }}>
              ({thisMonth}월 · {nextMonth}월)
            </span>
          </h3>
          {birthdayMembers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6c757d' }}>이번달 · 다음달 생일인 순원이 없습니다.</p>
          ) : (
            <div>
              {birthdayMembers.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid #f1f3f5',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{m.name}</span>
                    {isBirthdaySoon(m) && (
                      <span style={{ fontSize: '10px', background: '#ffe4e6', color: '#dc2626', padding: '1px 6px', borderRadius: '10px', fontWeight: '500' }}>D-soon</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>{formatBirthday(m)}</span>
                    <span style={{
                      fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                      background: m.birth_month === thisMonth ? '#dbeafe' : '#f1f5f9',
                      color: m.birth_month === thisMonth ? '#1e40af' : '#64748b',
                    }}>
                      {m.birth_month === thisMonth ? '이번달' : '다음달'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: '11px', color: '#adb5bd', margin: '10px 0 0' }}>
            * 생년월일 등록 후 표시됩니다.
          </p>
        </div>

        {/* 중요일정 메모 */}
        <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px' }}>중요 일정</h3>

          {/* 입력 폼 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <input
              type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
              style={{ width: '120px', padding: '6px 8px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '12px' }}
            />
            <input
              type="text" placeholder="일정 내용..." value={newEvent}
              onChange={e => setNewEvent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '12px' }}
            />
            <button
              onClick={handleAddEvent} disabled={addingEvent || !newEvent.trim()}
              style={{
                padding: '6px 12px', background: '#1a56db', color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                opacity: !newEvent.trim() ? 0.5 : 1,
              }}
            >
              추가
            </button>
          </div>

          {/* 일정 목록 */}
          {events.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6c757d' }}>등록된 일정이 없습니다.</p>
          ) : (
            <div>
              {events.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid #f1f3f5',
                }}>
                  <div>
                    {e.event_date && (
                      <span style={{ fontSize: '11px', color: '#1a56db', marginRight: '6px', fontFamily: 'monospace' }}>
                        {e.event_date}
                      </span>
                    )}
                    <span style={{ fontSize: '13px' }}>{e.title}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(e.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: '11px', color: '#adb5bd', margin: '10px 0 0' }}>
            * Supabase에 group_events 테이블이 필요합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
