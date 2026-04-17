'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  downloadMemberTemplate, downloadAttendanceTemplate,
  parseMemberSheet, parseAttendanceSheet,
  type ParsedMember, type ParsedAttendanceRow,
} from '@/lib/excel-import';

type Tab = 'member' | 'attendance';

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('member');
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // 순원 등록
  const [memberRows, setMemberRows] = useState<ParsedMember[]>([]);
  const [memberUploading, setMemberUploading] = useState(false);
  const [memberResult, setMemberResult] = useState<string>('');
  const memberRef = useRef<HTMLInputElement>(null);

  // 출석 기록
  const [attendRows, setAttendRows] = useState<ParsedAttendanceRow[]>([]);
  const [attendUploading, setAttendUploading] = useState(false);
  const [attendResult, setAttendResult] = useState<string>('');
  const attendRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) { router.push('/login'); return; }
      setUserId(session.user.id);
      const { data: user } = await supabase
        .from('users').select('group_id').eq('id', session.user.id).single();
      setGroupId(user?.group_id ?? '');
      setLoading(false);
    })();
  }, []);

  // ── 순원 파일 선택 ─────────────────────────────
  const handleMemberFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMemberResult('');
    try {
      const rows = await parseMemberSheet(file);
      setMemberRows(rows);
    } catch (err: any) {
      setMemberResult(`파싱 오류: ${err.message}`);
    }
  };

  // ── 순원 저장 ──────────────────────────────────
  const handleMemberUpload = async () => {
    if (!groupId || memberRows.length === 0) return;
    const validRows = memberRows.filter(r => r._errors.length === 0);
    if (validRows.length === 0) { setMemberResult('오류 없는 행이 없습니다.'); return; }
    setMemberUploading(true);
    setMemberResult('');
    try {
      const payload = validRows.map(r => ({
        group_id: groupId,
        name: r.name,
        gender: r.gender,
        is_leader: r.is_leader,
        birth_year: r.birth_year ?? null,
        birth_month: r.birth_month ?? null,
        birth_day: r.birth_day ?? null,
        phone: r.phone || null,
        address: r.address || null,
        job: r.job || null,
        family_notes: r.family_notes || null,
        joined_at: r.joined_at || null,
        member_status: r.member_status,
        notes: r.notes || null,
      }));
      const { error } = await supabase.from('members').insert(payload);
      if (error) throw error;
      setMemberResult(`✓ ${validRows.length}명 등록 완료`);
      setMemberRows([]);
      if (memberRef.current) memberRef.current.value = '';
    } catch (err: any) {
      setMemberResult(`저장 오류: ${err.message}`);
    } finally {
      setMemberUploading(false);
    }
  };

  // ── 출석 파일 선택 ─────────────────────────────
  const handleAttendFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttendResult('');
    try {
      const rows = await parseAttendanceSheet(file);
      setAttendRows(rows);
    } catch (err: any) {
      setAttendResult(`파싱 오류: ${err.message}`);
    }
  };

  // ── 출석 저장 ──────────────────────────────────
  const handleAttendUpload = async () => {
    if (!groupId || attendRows.length === 0) return;
    const validRows = attendRows.filter(r => r._errors.length === 0);
    if (validRows.length === 0) { setAttendResult('오류 없는 행이 없습니다.'); return; }
    setAttendUploading(true);
    setAttendResult('');

    try {
      // 날짜별로 그룹
      const byDate: Record<string, ParsedAttendanceRow[]> = {};
      for (const r of validRows) {
        if (!byDate[r.date]) byDate[r.date] = [];
        byDate[r.date].push(r);
      }

      // 전체 순원 목록 가져오기
      const { data: members } = await supabase
        .from('members').select('id, name').eq('group_id', groupId);
      const nameToId: Record<string, string> = {};
      for (const m of members ?? []) nameToId[m.name] = m.id;

      let saved = 0;
      let skipped = 0;

      for (const [date, rows] of Object.entries(byDate)) {
        // meeting upsert
        const { data: existingMeeting } = await supabase
          .from('meetings').select('id')
          .eq('group_id', groupId).eq('meeting_date', date).single();

        let meetingId = existingMeeting?.id;
        if (!meetingId) {
          const { data: newM } = await supabase
            .from('meetings')
            .insert({ group_id: groupId, meeting_date: date, place: '', is_urgent: false, created_by: userId })
            .select().single();
          meetingId = newM?.id;
        }
        if (!meetingId) continue;

        // 기록 upsert
        for (const row of rows) {
          const memberId = nameToId[row.name];
          if (!memberId) { skipped++; continue; }
          await supabase.from('meeting_member_records').upsert({
            meeting_id: meetingId,
            member_id: memberId,
            worship_attended: row.worship_attended,
            department_attended: row.department_attended,
            group_attended: row.group_attended,
            prayer_request: row.prayer_request || null,
            special_notes: row.special_notes || null,
            visitation_needed: row.visitation_needed,
          }, { onConflict: 'meeting_id,member_id' });
          saved++;
        }
      }

      let msg = `✓ ${saved}건 저장 완료`;
      if (skipped > 0) msg += ` / ${skipped}건 이름 불일치로 스킵됨`;
      setAttendResult(msg);
      setAttendRows([]);
      if (attendRef.current) attendRef.current.value = '';
    } catch (err: any) {
      setAttendResult(`저장 오류: ${err.message}`);
    } finally {
      setAttendUploading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>불러오는 중...</div>;

  const tabStyle = (t: Tab) => ({
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: tab === t ? '500' : '400',
    border: 'none',
    cursor: 'pointer',
    background: tab === t ? '#1a56db' : 'transparent',
    color: tab === t ? 'white' : '#6c757d',
  } as React.CSSProperties);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '0.5rem' }}>엑셀 일괄 업로드</h1>
      <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '1.5rem' }}>
        템플릿을 다운로드해서 작성 후, 파일을 업로드하세요.
      </p>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#f1f3f5', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        <button style={tabStyle('member')} onClick={() => setTab('member')}>순원 등록</button>
        <button style={tabStyle('attendance')} onClick={() => setTab('attendance')}>출석 / 기록</button>
      </div>

      {/* ── 순원 등록 탭 ── */}
      {tab === 'member' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={downloadMemberTemplate}
              style={{ padding: '8px 14px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
              템플릿 다운로드
            </button>
            <label style={{
              padding: '8px 14px', background: '#1a56db', color: 'white',
              borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
            }}>
              파일 선택
              <input ref={memberRef} type="file" accept=".xlsx,.xls" onChange={handleMemberFile} style={{ display: 'none' }} />
            </label>
          </div>

          {memberRows.length > 0 && (
            <>
              <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>미리보기 ({memberRows.length}행)</span>
                  <span style={{ fontSize: '12px', color: memberRows.some(r => r._errors.length) ? '#dc3545' : '#198754' }}>
                    {memberRows.filter(r => r._errors.length === 0).length}행 등록 가능 /&nbsp;
                    {memberRows.filter(r => r._errors.length > 0).length}행 오류
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['행', '이름', '역할', '성별', '생년도', '연락처', '직업', '상태', '오류'].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '11px', color: '#6c757d', fontWeight: '500', borderBottom: '1px solid #e9ecef', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memberRows.map(r => (
                        <tr key={r._row} style={{ background: r._errors.length ? '#fff5f5' : 'white', borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '6px 10px', color: '#6c757d' }}>{r._row}</td>
                          <td style={{ padding: '6px 10px', fontWeight: '500' }}>{r.name}</td>
                          <td style={{ padding: '6px 10px' }}>{r.is_leader ? '순장' : '순원'}</td>
                          <td style={{ padding: '6px 10px' }}>{r.gender}성</td>
                          <td style={{ padding: '6px 10px', color: '#6c757d' }}>{r.birth_year ?? '-'}</td>
                          <td style={{ padding: '6px 10px', color: '#6c757d' }}>{r.phone || '-'}</td>
                          <td style={{ padding: '6px 10px', color: '#6c757d' }}>{r.job || '-'}</td>
                          <td style={{ padding: '6px 10px', color: '#6c757d' }}>{r.member_status}</td>
                          <td style={{ padding: '6px 10px', color: '#dc3545', fontSize: '11px' }}>{r._errors.join(', ') || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleMemberUpload} disabled={memberUploading}
                  style={{ padding: '9px 20px', background: memberUploading ? '#6c757d' : '#1a56db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  {memberUploading ? '저장 중...' : `${memberRows.filter(r => !r._errors.length).length}명 등록`}
                </button>
                <button onClick={() => { setMemberRows([]); if (memberRef.current) memberRef.current.value = ''; }}
                  style={{ padding: '9px 14px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
                  취소
                </button>
                {memberResult && (
                  <span style={{ fontSize: '13px', color: memberResult.startsWith('✓') ? '#198754' : '#dc3545' }}>
                    {memberResult}
                  </span>
                )}
              </div>
            </>
          )}
          {memberRows.length === 0 && memberResult && (
            <p style={{ color: '#dc3545', fontSize: '13px' }}>{memberResult}</p>
          )}
        </div>
      )}

      {/* ── 출석 / 기록 탭 ── */}
      {tab === 'attendance' && (
        <div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#92400e' }}>
            이름이 순원 목록에 등록된 이름과 정확히 일치해야 합니다. 불일치 행은 자동으로 스킵됩니다.
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={downloadAttendanceTemplate}
              style={{ padding: '8px 14px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
              템플릿 다운로드
            </button>
            <label style={{
              padding: '8px 14px', background: '#1a56db', color: 'white',
              borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
            }}>
              파일 선택
              <input ref={attendRef} type="file" accept=".xlsx,.xls" onChange={handleAttendFile} style={{ display: 'none' }} />
            </label>
          </div>

          {attendRows.length > 0 && (
            <>
              <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>미리보기 ({attendRows.length}행)</span>
                  <span style={{ fontSize: '12px', color: attendRows.some(r => r._errors.length) ? '#dc3545' : '#198754' }}>
                    {attendRows.filter(r => r._errors.length === 0).length}행 저장 가능 /&nbsp;
                    {attendRows.filter(r => r._errors.length > 0).length}행 오류
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['행', '날짜', '이름', '예배', '부서', '순모임', '심방', '기도제목', '오류'].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '11px', color: '#6c757d', fontWeight: '500', borderBottom: '1px solid #e9ecef', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendRows.map(r => (
                        <tr key={`${r._row}-${r.name}`} style={{ background: r._errors.length ? '#fff5f5' : 'white', borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '6px 10px', color: '#6c757d' }}>{r._row}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{r.date}</td>
                          <td style={{ padding: '6px 10px', fontWeight: '500' }}>{r.name}</td>
                          <td style={{ padding: '6px 10px', color: r.worship_attended ? '#0f6e56' : '#6c757d', fontWeight: '500' }}>{r.worship_attended ? 'O' : 'X'}</td>
                          <td style={{ padding: '6px 10px', color: r.department_attended ? '#0f6e56' : '#6c757d', fontWeight: '500' }}>{r.department_attended ? 'O' : 'X'}</td>
                          <td style={{ padding: '6px 10px', color: r.group_attended ? '#0f6e56' : '#6c757d', fontWeight: '500' }}>{r.group_attended ? 'O' : 'X'}</td>
                          <td style={{ padding: '6px 10px', color: r.visitation_needed ? '#dc8a00' : '#6c757d', fontWeight: '500' }}>{r.visitation_needed ? 'O' : '-'}</td>
                          <td style={{ padding: '6px 10px', color: '#6c757d', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.prayer_request || '-'}</td>
                          <td style={{ padding: '6px 10px', color: '#dc3545', fontSize: '11px' }}>{r._errors.join(', ') || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleAttendUpload} disabled={attendUploading}
                  style={{ padding: '9px 20px', background: attendUploading ? '#6c757d' : '#1a56db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  {attendUploading ? '저장 중...' : `${attendRows.filter(r => !r._errors.length).length}건 저장`}
                </button>
                <button onClick={() => { setAttendRows([]); if (attendRef.current) attendRef.current.value = ''; }}
                  style={{ padding: '9px 14px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}>
                  취소
                </button>
                {attendResult && (
                  <span style={{ fontSize: '13px', color: attendResult.startsWith('✓') ? '#198754' : '#dc3545' }}>
                    {attendResult}
                  </span>
                )}
              </div>
            </>
          )}
          {attendRows.length === 0 && attendResult && (
            <p style={{ color: '#dc3545', fontSize: '13px' }}>{attendResult}</p>
          )}
        </div>
      )}
    </div>
  );
}
