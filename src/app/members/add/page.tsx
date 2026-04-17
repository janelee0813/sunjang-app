'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function MemberAddPage() {
  const supabase = createClient();
  const router = useRouter();
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gender: '남',
    is_leader: false,
    birth_year: '',
    birth_month: '',
    birth_day: '',
    phone: '',
    address: '',
    job: '',
    family_notes: '',
    joined_at: new Date().toISOString().slice(0, 10),
    member_status: 'active',
    notes: '',
  });

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) { router.push('/login'); return; }
      const { data: user } = await supabase
        .from('users').select('group_id').eq('id', session.user.id).single();
      setGroupId(user?.group_id ?? '');
    })();
  }, []);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!form.gender) { alert('성별을 선택해주세요.'); return; }
    setSaving(true);
    try {
      const payload: any = {
        group_id: groupId,
        name: form.name.trim(),
        gender: form.gender,
        is_leader: form.is_leader,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        birth_month: form.birth_month ? parseInt(form.birth_month) : null,
        birth_day: form.birth_day ? parseInt(form.birth_day) : null,
        phone: form.phone || null,
        address: form.address || null,
        job: form.job || null,
        family_notes: form.family_notes || null,
        joined_at: form.joined_at || null,
        member_status: form.member_status,
        notes: form.notes || null,
      };
      const { error } = await supabase.from('members').insert(payload);
      if (error) throw error;
      router.push('/members');
    } catch (e: any) {
      alert(`저장 오류: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
    borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '4px',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '640px' }}>
      <button onClick={() => router.push('/members')}
        style={{ fontSize: '13px', color: '#6c757d', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', padding: '0' }}>
        ← 목록으로
      </button>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem' }}>순원 등록</h1>

      <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 이름 + 성별 + 역할 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '12px' }}>
          <div>
            <label style={labelStyle}>이름 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>성별 *</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} style={{ ...inputStyle }}>
              <option value="남">남성</option>
              <option value="여">여성</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>역할</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, is_leader: false }))}
                style={{
                  flex: 1, padding: '8px 0', border: `1.5px solid ${!form.is_leader ? '#1a56db' : '#dee2e6'}`,
                  borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: !form.is_leader ? '#eff6ff' : 'white',
                  color: !form.is_leader ? '#1a56db' : '#6c757d', fontWeight: !form.is_leader ? '500' : '400',
                }}
              >순원</button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, is_leader: true }))}
                style={{
                  flex: 1, padding: '8px 0', border: `1.5px solid ${form.is_leader ? '#1a56db' : '#dee2e6'}`,
                  borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: form.is_leader ? '#1a56db' : 'white',
                  color: form.is_leader ? 'white' : '#6c757d', fontWeight: form.is_leader ? '600' : '400',
                }}
              >순장</button>
            </div>
          </div>
        </div>

        {/* 생년 + 생일 */}
        <div>
          <label style={labelStyle}>생년월일</label>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 90px 90px', gap: '8px' }}>
            <div>
              <input
                type="number" value={form.birth_year} onChange={e => set('birth_year', e.target.value)}
                placeholder="출생연도 (예: 1998)" style={inputStyle}
              />
            </div>
            <div>
              <select value={form.birth_month} onChange={e => set('birth_month', e.target.value)} style={{ ...inputStyle }}>
                <option value="">월</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            </div>
            <div>
              <select value={form.birth_day} onChange={e => set('birth_day', e.target.value)} style={{ ...inputStyle }}>
                <option value="">일</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#adb5bd', margin: '4px 0 0' }}>생일 안내는 월/일 기준으로 표시됩니다.</p>
        </div>

        {/* 연락처 */}
        <div>
          <label style={labelStyle}>연락처</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" style={inputStyle} />
        </div>

        {/* 주소 + 직업 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>주소</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="서울시 강남구" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>직업</label>
            <input value={form.job} onChange={e => set('job', e.target.value)} placeholder="회사원" style={inputStyle} />
          </div>
        </div>

        {/* 등록일 + 상태 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>등록일</label>
            <input type="date" value={form.joined_at} onChange={e => set('joined_at', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>상태</label>
            <select value={form.member_status} onChange={e => set('member_status', e.target.value)} style={{ ...inputStyle }}>
              <option value="active">활동중</option>
              <option value="care">관리필요</option>
              <option value="inactive">장기불참</option>
            </select>
          </div>
        </div>

        {/* 가족사항 */}
        <div>
          <label style={labelStyle}>가족 사항</label>
          <textarea
            value={form.family_notes} onChange={e => set('family_notes', e.target.value)}
            placeholder="가족 관련 메모..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
          />
        </div>

        {/* 목양 메모 */}
        <div>
          <label style={labelStyle}>목양 메모</label>
          <textarea
            value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="기타 메모..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px 24px', background: saving ? '#6c757d' : '#1a56db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          {saving ? '저장 중...' : '등록'}
        </button>
        <button onClick={() => router.push('/members')}
          style={{ padding: '10px 16px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', background: 'white' }}>
          취소
        </button>
      </div>
    </div>
  );
}
