'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function MembersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMenu, setActionMenu] = useState<string | null>(null); // member id with open menu

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
      .not('member_status', 'in', '("removed","lineout")')
      .order('name');

    setMembers(m ?? []);
    setFiltered(m ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let result = members;
    if (search) result = result.filter(m => m.name.includes(search));
    if (statusFilter) result = result.filter(m => m.member_status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, members]);

  const handleLineout = async (id: string, name: string) => {
    if (!confirm(`'${name}'을(를) 라인아웃 처리하시겠습니까?\n라인아웃된 순원은 라인아웃 메뉴에서 확인할 수 있습니다.`)) return;
    await supabase.from('members').update({ member_status: 'lineout' }).eq('id', id);
    setActionMenu(null);
    loadMembers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}'을(를) 삭제하시겠습니까?\n삭제된 순원은 목록에서 완전히 제외됩니다.`)) return;
    await supabase.from('members').update({ member_status: 'removed' }).eq('id', id);
    setActionMenu(null);
    loadMembers();
  };

  const statusLabel: Record<string, string> = {
    active: '활동중', care: '관리필요', inactive: '비활성', moved: '이동'
  };
  const statusColor: Record<string, string> = {
    active: '#198754', care: '#dc8a00', inactive: '#dc3545', moved: '#6c757d'
  };
  const statusBg: Record<string, string> = {
    active: '#d1e7dd', care: '#fff3cd', inactive: '#f8d7da', moved: '#e9ecef'
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>불러오는 중...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }} onClick={() => setActionMenu(null)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '500', margin: '0' }}>순원 목록</h1>
        <button
          onClick={() => router.push('/members/add')}
          style={{ padding: '8px 16px', background: '#1a56db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
        >
          + 순원 등록
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text" placeholder="이름으로 검색..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px' }}
        />
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '13px', background: 'white' }}
        >
          <option value="">전체 상태</option>
          <option value="active">활동중</option>
          <option value="care">관리필요</option>
          <option value="inactive">비활성</option>
          <option value="moved">이동</option>
        </select>
      </div>

      <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['이름', '성별', '나이', '연락처', '직업', '등록일', '상태', ''].map((h, i) => (
                <th key={i} style={{
                  textAlign: 'left', padding: '10px 14px', fontSize: '11px', color: '#6c757d',
                  fontWeight: '500', borderBottom: '1px solid #e9ecef',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>순원이 없습니다.</td></tr>
            ) : (
              filtered.map(m => (
                <tr
                  key={m.id}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f1f3f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <td style={{ padding: '10px 14px', fontWeight: '500' }} onClick={() => router.push(`/members/${m.id}`)}>{m.name}</td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }} onClick={() => router.push(`/members/${m.id}`)}>{m.gender}성</td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }} onClick={() => router.push(`/members/${m.id}`)}>
                    {m.birth_year ? `${new Date().getFullYear() - m.birth_year}세` : '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6c757d', fontFamily: 'monospace' }} onClick={() => router.push(`/members/${m.id}`)}>
                    {m.phone ? m.phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3') : '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }} onClick={() => router.push(`/members/${m.id}`)}>{m.job ?? '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#6c757d' }} onClick={() => router.push(`/members/${m.id}`)}>{m.joined_at ?? '-'}</td>
                  <td style={{ padding: '10px 14px' }} onClick={() => router.push(`/members/${m.id}`)}>
                    <span style={{
                      fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px',
                      background: statusBg[m.member_status] ?? '#e9ecef',
                      color: statusColor[m.member_status] ?? '#6c757d',
                    }}>
                      {statusLabel[m.member_status] ?? m.member_status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === m.id ? null : m.id); }}
                      style={{
                        padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: '6px',
                        fontSize: '14px', cursor: 'pointer', background: 'white', color: '#6c757d',
                        lineHeight: 1,
                      }}
                    >⋮</button>
                    {actionMenu === m.id && (
                      <div style={{
                        position: 'absolute', right: '10px', top: '36px', background: 'white',
                        border: '1px solid #e9ecef', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 100, minWidth: '120px', overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => handleLineout(m.id, m.name)}
                          style={{
                            display: 'block', width: '100%', padding: '9px 14px',
                            fontSize: '13px', border: 'none', background: 'white',
                            cursor: 'pointer', textAlign: 'left', color: '#dc8a00',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fff3cd')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                        >
                          라인아웃
                        </button>
                        <div style={{ borderTop: '1px solid #f1f3f5' }} />
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          style={{
                            display: 'block', width: '100%', padding: '9px 14px',
                            fontSize: '13px', border: 'none', background: 'white',
                            cursor: 'pointer', textAlign: 'left', color: '#dc3545',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>총 {filtered.length}명</p>
    </div>
  );
}
