'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

const SETUP_SQL = `-- Supabase SQL Editor에서 실행하세요
CREATE TABLE IF NOT EXISTS group_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL UNIQUE,
  group_name TEXT NOT NULL DEFAULT '우리 순',
  pastor_name TEXT,
  pastor_phone TEXT,
  leader_phone TEXT,
  birthday_notice_days INTEGER NOT NULL DEFAULT 7,
  chart_months INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE group_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group settings access" ON group_settings
  USING (group_id IN (SELECT group_id FROM users WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT group_id FROM users WHERE id = auth.uid()));

-- 신규 초대 계정 자동 그룹 등록 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, group_id)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'group_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [showSetupSql, setShowSetupSql] = useState(false);

  // 순 기본 정보
  const [groupName, setGroupName] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [pastorPhone, setPastorPhone] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 표시 설정
  const [birthdayDays, setBirthdayDays] = useState(7);
  const [chartMonths, setChartMonths] = useState(2);
  const [dispSaving, setDispSaving] = useState(false);
  const [dispMsg, setDispMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 계정 관리
  const [accounts, setAccounts] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showTriggerSql, setShowTriggerSql] = useState(false);

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 내보내기
  const [exporting, setExporting] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: ud } = await supabase.from('users').select('group_id, email').eq('id', user.id).single();
      if (!ud?.group_id) { setLoading(false); return; }
      setGroupId(ud.group_id);

      // group_settings 로드
      const { data: gs, error: gsErr } = await supabase
        .from('group_settings').select('*').eq('group_id', ud.group_id).maybeSingle();
      if (gsErr?.code === '42P01') {
        setDbReady(false);
      } else if (gs) {
        setGroupName(gs.group_name ?? '');
        setPastorName(gs.pastor_name ?? '');
        setPastorPhone(gs.pastor_phone ?? '');
        setLeaderPhone(gs.leader_phone ?? '');
        setBirthdayDays(gs.birthday_notice_days ?? 7);
        setChartMonths(gs.chart_months ?? 2);
      }

      // 계정 목록
      const { data: accs } = await supabase
        .from('users').select('id, email').eq('group_id', ud.group_id);
      setAccounts(accs ?? []);

      setLoading(false);
    })();
  }, []);

  const saveGroupSettings = async (extra?: Partial<Record<string, any>>) => {
    if (!groupId) return false;
    const payload = {
      group_id: groupId,
      group_name: groupName,
      pastor_name: pastorName || null,
      pastor_phone: pastorPhone || null,
      leader_phone: leaderPhone || null,
      birthday_notice_days: birthdayDays,
      chart_months: chartMonths,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const { error } = await supabase.from('group_settings').upsert(payload, { onConflict: 'group_id' });
    return !error;
  };

  const handleInfoSave = async () => {
    setInfoSaving(true); setInfoMsg(null);
    const ok = await saveGroupSettings();
    if (ok) {
      setInfoMsg({ text: '저장되었습니다.', ok: true });
      sessionStorage.removeItem('groupName');
    } else {
      setInfoMsg({ text: 'group_settings 테이블이 필요합니다. SQL 설정을 먼저 실행해주세요.', ok: false });
    }
    setInfoSaving(false);
  };

  const handleDispSave = async () => {
    setDispSaving(true); setDispMsg(null);
    const ok = await saveGroupSettings();
    setDispMsg(ok
      ? { text: '저장되었습니다. 대시보드에 반영됩니다.', ok: true }
      : { text: 'group_settings 테이블이 필요합니다.', ok: false }
    );
    setDispSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !groupId) return;
    setInviting(true); setInviteMsg(null);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), groupId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setInviteMsg({ text: `초대 이메일을 발송했습니다. (${inviteEmail})`, ok: true });
      setInviteEmail('');
    } catch (e: any) {
      setInviteMsg({ text: e.message, ok: false });
    }
    setInviting(false);
  };

  const handlePwChange = async () => {
    setPwMsg(null);
    if (!newPw) { setPwMsg({ text: '새 비밀번호를 입력해주세요.', ok: false }); return; }
    if (newPw.length < 6) { setPwMsg({ text: '비밀번호는 6자 이상이어야 합니다.', ok: false }); return; }
    if (newPw !== confirmPw) { setPwMsg({ text: '새 비밀번호가 일치하지 않습니다.', ok: false }); return; }
    setPwSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('로그인 정보를 확인할 수 없습니다.');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (signInError) { setPwMsg({ text: '현재 비밀번호가 올바르지 않습니다.', ok: false }); return; }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwMsg({ text: '비밀번호가 변경되었습니다.', ok: true });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      setPwMsg({ text: `오류: ${e.message}`, ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  const handleExportMembers = async () => {
    setExporting('members');
    const { data: members } = await supabase
      .from('members').select('*').eq('group_id', groupId)
      .neq('member_status', 'removed').order('is_leader', { ascending: false }).order('name');
    if (!members?.length) { setExporting(''); alert('순원 데이터가 없습니다.'); return; }

    const statusLabel: Record<string, string> = { active: '활동중', care: '관리필요', inactive: '장기불참', lineout: '라인아웃' };
    const rows = members.map(m => ({
      이름: m.name,
      역할: m.is_leader ? '순장' : '순원',
      성별: m.gender ? `${m.gender}성` : '',
      생년도: m.birth_year ?? '',
      생월: m.birth_month ?? '',
      생일: m.birth_day ?? '',
      연락처: m.phone ?? '',
      주소: m.address ?? '',
      직업: m.job ?? '',
      가족사항: m.family_notes ?? '',
      등록일: m.joined_at ?? '',
      상태: statusLabel[m.member_status] ?? m.member_status,
      메모: m.notes ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 5 }, { wch: 5 },
      { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, '순원목록');
    XLSX.writeFile(wb, `순원목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting('');
  };

  const handleExportAttendance = async () => {
    setExporting('attendance');
    const { data: members } = await supabase.from('members').select('id, name').eq('group_id', groupId);
    const { data: meetings } = await supabase.from('meetings').select('id, meeting_date').eq('group_id', groupId).order('meeting_date');
    const memberIds = (members ?? []).map(m => m.id);

    let records: any[] = [];
    if (memberIds.length > 0 && (meetings ?? []).length > 0) {
      const meetingIds = (meetings ?? []).map(m => m.id);
      const { data: r } = await supabase.from('meeting_member_records').select('*').in('meeting_id', meetingIds).in('member_id', memberIds);
      records = r ?? [];
    }

    if (!records.length) { setExporting(''); alert('출석 기록이 없습니다.'); return; }

    const nameMap: Record<string, string> = {};
    for (const m of members ?? []) nameMap[m.id] = m.name;
    const dateMap: Record<string, string> = {};
    for (const m of meetings ?? []) dateMap[m.id] = m.meeting_date;

    const rows = records.map(r => ({
      날짜: dateMap[r.meeting_id] ?? '',
      이름: nameMap[r.member_id] ?? '',
      예배출석: r.worship_attended ? 'O' : 'X',
      부서출석: r.department_attended ? 'O' : 'X',
      순모임출석: r.group_attended ? 'O' : 'X',
      기도제목: r.prayer_request ?? '',
      특이사항: r.special_notes ?? '',
      심방필요: r.visitation_needed ? 'O' : 'X',
    }));
    rows.sort((a, b) => a.날짜.localeCompare(b.날짜) || a.이름.localeCompare(b.이름));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, '출석기록');
    XLSX.writeFile(wb, `출석기록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting('');
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>불러오는 중...</div>;

  const card: React.CSSProperties = { background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.2rem', marginBottom: '16px' };
  const sectionTitle: React.CSSProperties = { fontSize: '14px', fontWeight: '600', margin: '0 0 12px', color: '#1f2937' };
  const label: React.CSSProperties = { fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '4px' };
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' };
  const saveBtn = (loading: boolean): React.CSSProperties => ({
    padding: '8px 20px', background: loading ? '#6c757d' : '#1a56db', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: loading ? 'default' : 'pointer',
  });
  const msgBox = (ok: boolean): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginTop: '10px',
    background: ok ? '#d1e7dd' : '#f8d7da', color: ok ? '#0a3622' : '#58151c',
  });
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: 'none',
    background: active ? '#1a56db' : '#f1f3f5', color: active ? 'white' : '#6c757d', fontWeight: active ? '500' : '400',
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem' }}>설정</h1>

      {/* DB 설정 안내 */}
      {!dbReady && (
        <div style={{ background: '#fff3cd', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 6px', color: '#92400e' }}>⚠ DB 설정이 필요합니다</p>
          <p style={{ fontSize: '12px', color: '#78350f', margin: '0 0 8px' }}>
            group_settings 테이블이 없습니다. 아래 SQL을 Supabase SQL Editor에서 실행한 후 새로고침해주세요.
          </p>
          <button onClick={() => setShowSetupSql(v => !v)}
            style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #f59e0b', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#92400e' }}>
            {showSetupSql ? 'SQL 숨기기' : 'SQL 보기'}
          </button>
          {showSetupSql && (
            <pre style={{ marginTop: '10px', background: '#1f2937', color: '#e5e7eb', padding: '12px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {SETUP_SQL}
            </pre>
          )}
        </div>
      )}

      {/* ── 순 기본 정보 ── */}
      <div style={card}>
        <h2 style={sectionTitle}>순 기본 정보</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={label}>순 이름</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="이종환 순" style={input} />
            <p style={{ fontSize: '11px', color: '#adb5bd', margin: '3px 0 0' }}>사이드바에 표시되는 이름입니다.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={label}>담당 교역자 이름</label>
              <input value={pastorName} onChange={e => setPastorName(e.target.value)} placeholder="홍길동 전도사" style={input} />
            </div>
            <div>
              <label style={label}>담당 교역자 연락처</label>
              <input value={pastorPhone} onChange={e => setPastorPhone(e.target.value)} placeholder="010-0000-0000" style={input} />
            </div>
          </div>
          <div>
            <label style={label}>순장 연락처</label>
            <input value={leaderPhone} onChange={e => setLeaderPhone(e.target.value)} placeholder="010-0000-0000" style={input} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <button onClick={handleInfoSave} disabled={infoSaving} style={saveBtn(infoSaving)}>
            {infoSaving ? '저장 중...' : '저장'}
          </button>
          {infoMsg && <div style={msgBox(infoMsg.ok)}>{infoMsg.text}</div>}
        </div>
      </div>

      {/* ── 표시 설정 ── */}
      <div style={card}>
        <h2 style={sectionTitle}>표시 설정</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ ...label, marginBottom: '8px' }}>생일 알림 기준 (D-soon 표시)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setBirthdayDays(d)} style={toggleBtn(birthdayDays === d)}>
                  {d}일 이내
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ ...label, marginBottom: '8px' }}>출석 통계 차트 기간</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 6].map(m => (
                <button key={m} onClick={() => setChartMonths(m)} style={toggleBtn(chartMonths === m)}>
                  {m}개월
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <button onClick={handleDispSave} disabled={dispSaving} style={saveBtn(dispSaving)}>
            {dispSaving ? '저장 중...' : '저장'}
          </button>
          {dispMsg && <div style={msgBox(dispMsg.ok)}>{dispMsg.text}</div>}
        </div>
      </div>

      {/* ── 데이터 내보내기 ── */}
      <div style={card}>
        <h2 style={sectionTitle}>데이터 내보내기</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 2px' }}>순원 목록</p>
              <p style={{ fontSize: '11px', color: '#6c757d', margin: 0 }}>전체 순원 정보를 엑셀 파일로 다운로드</p>
            </div>
            <button onClick={handleExportMembers} disabled={exporting === 'members'}
              style={{ padding: '7px 14px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'white', whiteSpace: 'nowrap' }}>
              {exporting === 'members' ? '처리 중...' : '다운로드'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 2px' }}>출석 기록 전체</p>
              <p style={{ fontSize: '11px', color: '#6c757d', margin: 0 }}>전체 출석 기록을 엑셀 파일로 다운로드</p>
            </div>
            <button onClick={handleExportAttendance} disabled={exporting === 'attendance'}
              style={{ padding: '7px 14px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'white', whiteSpace: 'nowrap' }}>
              {exporting === 'attendance' ? '처리 중...' : '다운로드'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 계정 관리 ── */}
      <div style={card}>
        <h2 style={sectionTitle}>계정 관리</h2>

        {/* 현재 계정 목록 */}
        <p style={{ fontSize: '12px', color: '#6c757d', margin: '0 0 8px' }}>현재 접속 가능 계정</p>
        <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
          {accounts.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#6c757d', margin: 0 }}>-</p>
          ) : (
            accounts.map((a, i) => (
              <p key={a.id} style={{ fontSize: '12px', margin: i === accounts.length - 1 ? 0 : '0 0 4px', color: '#374151' }}>
                {a.email ?? `계정 ${i + 1}`}
              </p>
            ))
          )}
        </div>

        {/* 초대 */}
        <p style={{ fontSize: '12px', color: '#6c757d', margin: '0 0 6px' }}>이메일로 공동 관리자 초대</p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="example@email.com"
            style={{ ...input, flex: 1 }} />
          <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
            style={{ ...saveBtn(inviting || !inviteEmail.trim()), whiteSpace: 'nowrap' }}>
            {inviting ? '발송 중...' : '초대'}
          </button>
        </div>
        {inviteMsg && <div style={msgBox(inviteMsg.ok)}>{inviteMsg.text}</div>}

        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <p style={{ fontSize: '12px', color: '#0369a1', margin: '0 0 4px', fontWeight: '500' }}>초대 기능 사용 전 필요한 설정</p>
          <p style={{ fontSize: '11px', color: '#0284c7', margin: '0 0 6px' }}>
            1. Vercel 환경변수에 <code style={{ background: '#e0f2fe', padding: '1px 4px', borderRadius: '3px' }}>SUPABASE_SERVICE_ROLE_KEY</code> 추가<br/>
            2. 아래 트리거 SQL을 Supabase에서 실행 (초대된 계정이 자동으로 그룹에 등록됨)
          </p>
          <button onClick={() => setShowTriggerSql(v => !v)}
            style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid #7dd3fc', borderRadius: '5px', background: 'white', cursor: 'pointer', color: '#0369a1' }}>
            {showTriggerSql ? '숨기기' : 'SQL 보기'}
          </button>
          {showTriggerSql && (
            <pre style={{ marginTop: '8px', background: '#1f2937', color: '#e5e7eb', padding: '10px', borderRadius: '6px', fontSize: '10px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, group_id)
  VALUES (NEW.id, NEW.email,
    (NEW.raw_user_meta_data->>'group_id')::UUID)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`}
            </pre>
          )}
        </div>
      </div>

      {/* ── 비밀번호 변경 ── */}
      <div style={card}>
        <h2 style={sectionTitle}>비밀번호 변경</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={label}>현재 비밀번호</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="현재 비밀번호 입력" style={input} />
          </div>
          <div>
            <label style={label}>새 비밀번호</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="6자 이상" style={input} />
          </div>
          <div>
            <label style={label}>새 비밀번호 확인</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="새 비밀번호 재입력" style={input}
              onKeyDown={e => e.key === 'Enter' && handlePwChange()} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <button onClick={handlePwChange} disabled={pwSaving} style={saveBtn(pwSaving)}>
            {pwSaving ? '변경 중...' : '비밀번호 변경'}
          </button>
          {pwMsg && <div style={msgBox(pwMsg.ok)}>{pwMsg.text}</div>}
        </div>
      </div>
    </div>
  );
}
