'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async () => {
    setMessage(null);

    if (!newPassword) { setMessage({ text: '새 비밀번호를 입력해주세요.', ok: false }); return; }
    if (newPassword.length < 6) { setMessage({ text: '비밀번호는 6자 이상이어야 합니다.', ok: false }); return; }
    if (newPassword !== confirmPassword) { setMessage({ text: '새 비밀번호가 일치하지 않습니다.', ok: false }); return; }

    setSaving(true);
    try {
      // 현재 비밀번호로 재인증
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('로그인 정보를 확인할 수 없습니다.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setMessage({ text: '현재 비밀번호가 올바르지 않습니다.', ok: false });
        return;
      }

      // 비밀번호 변경
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage({ text: '비밀번호가 변경되었습니다.', ok: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setMessage({ text: `오류: ${e.message}`, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #dee2e6',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: '#495057', display: 'block', marginBottom: '6px', fontWeight: '500',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '480px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem' }}>설정</h1>

      <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 1.2rem', color: '#212529' }}>비밀번호 변경</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호 입력"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="6자 이상"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 재입력"
              style={inputStyle}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

          {message && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: message.ok ? '#d1e7dd' : '#f8d7da',
              color: message.ok ? '#0a3622' : '#58151c',
            }}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '10px 24px', background: saving ? '#6c757d' : '#1a56db',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', cursor: saving ? 'default' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {saving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </div>
    </div>
  );
}
