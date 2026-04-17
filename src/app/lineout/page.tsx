'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LineoutPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) { router.push('/login'); return; }

    const { data: user } = await supabase
      .from('users').select('group_id').eq('id', session.user.id).single();
    if (!user?.group_id) { setLoading(false); return; }

    const { data: m } = await supabase
      .from('members').select('*')
      .eq('group_id', user.group_id)
      .eq('member_status', 'lineout')
      .order('name');

    setMembers(m ?? []);
    setLoading(false);
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`'${name}'을(를) 순원 목록으로 복귀시키겠습니까?`)) return;
    await supabase.from('members').update({ member_status: 'active' }).eq('id', id);
    loadMembers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}'을(를) 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    await supabase.from('members').update({ member_status: 'removed' }).eq('id', id);
    loadMembers();
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>불러오는 중...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '0.5rem' }}>라인아웃</h1>
      <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '1.5rem' }}>
        당분간 순모임에 참여하지 못하는 순원 목록입니다. 복귀 시 순원 목록으로 이동됩니다.
      </p>

      {members.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#6c757d', fontSize: '14px' }}>
          라인아웃된 순원이 없습니다.
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['이름', '성별', '나이', '연락처', '직업', '작업'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 14px', fontSize: '11px',
                    color: '#6c757d', fontWeight: '500', borderBottom: '1px solid #e9ecef',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '500' }}>{m.name}</td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }}>{m.gender}성</td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }}>
                    {m.birth_year ? `${new Date().getFullYear() - m.birth_year}세` : '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6c757d', fontFamily: 'monospace' }}>
                    {m.phone ? m.phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3') : '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }}>{m.job ?? '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleRestore(m.id, m.name)}
                        style={{
                          padding: '5px 12px', background: '#d1e7dd', color: '#198754',
                          border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                        }}
                      >
                        복귀
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.name)}
                        style={{
                          padding: '5px 12px', background: '#f8d7da', color: '#dc3545',
                          border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>총 {members.length}명</p>
    </div>
  );
}
