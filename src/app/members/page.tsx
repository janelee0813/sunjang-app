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
        .order('name');

      setMembers(m ?? []);
      setFiltered(m ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let result = members;
    if (search) result = result.filter(m => m.name.includes(search));
    if (statusFilter) result = result.filter(m => m.member_status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, members]);

  const statusLabel: Record<string, string> = {
    active: '활동중', care: '관리필요', inactive: '비활성', moved: '이동'
  };
  const statusColor: Record<string, string> = {
    active: '#198754', care: '#dc8a00', inactive: '#dc3545', moved: '#6c757d'
  };
  const statusBg: Record<string, string> = {
    active: '#d1e7dd', care: '#fff3cd', inactive: '#f8d7da', moved: '#e9ecef'
  };

  if (loading) return <div style={{padding:'2rem', color:'#6c757d'}}>불러오는 중...</div>;

  return (
    <div style={{padding:'2rem', maxWidth:'1000px'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:'18px', fontWeight:'500', margin:'0'}}>순원 목록</h1>
        <button
          onClick={() => router.push('/members/add')}
          style={{padding:'8px 16px', background:'#1a56db', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', cursor:'pointer'}}
        >
          + 순원 등록
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
        <input
          type="text"
          placeholder="이름으로 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{flex:1, padding:'8px 12px', border:'1px solid #dee2e6', borderRadius:'8px', fontSize:'13px'}}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{padding:'8px 12px', border:'1px solid #dee2e6', borderRadius:'8px', fontSize:'13px', background:'white'}}
        >
          <option value="">전체 상태</option>
          <option value="active">활동중</option>
          <option value="care">관리필요</option>
          <option value="inactive">비활성</option>
          <option value="moved">이동</option>
        </select>
      </div>

      {/* 테이블 */}
      <div style={{background:'white', border:'1px solid #e9ecef', borderRadius:'12px', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead>
            <tr style={{background:'#f8f9fa'}}>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>이름</th>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>성별</th>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>나이</th>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>연락처</th>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>직업</th>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>등록일</th>
              <th style={{textAlign:'left', padding:'10px 14px', fontSize:'11px', color:'#6c757d', fontWeight:'500', borderBottom:'1px solid #e9ecef'}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{padding:'2rem', textAlign:'center', color:'#6c757d'}}>
                  순원이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map(m => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/members/${m.id}`)}
                  style={{cursor:'pointer', borderBottom:'1px solid #f1f3f5'}}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <td style={{padding:'10px 14px', fontWeight:'500'}}>{m.name}</td>
                  <td style={{padding:'10px 14px', color:'#6c757d'}}>{m.gender}성</td>
                  <td style={{padding:'10px 14px', color:'#6c757d'}}>{m.birth_year ? `${new Date().getFullYear() - m.birth_year}세` : '-'}</td>
                  <td style={{padding:'10px 14px', color:'#6c757d', fontFamily:'monospace'}}>
                    {m.phone ? m.phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3') : '-'}
                  </td>
                  <td style={{padding:'10px 14px', color:'#6c757d'}}>{m.job ?? '-'}</td>
                  <td style={{padding:'10px 14px', color:'#6c757d'}}>{m.joined_at ?? '-'}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{
                      fontSize:'11px', fontWeight:'500', padding:'2px 8px', borderRadius:'20px',
                      background: statusBg[m.member_status] ?? '#e9ecef',
                      color: statusColor[m.member_status] ?? '#6c757d'
                    }}>
                      {statusLabel[m.member_status] ?? m.member_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{fontSize:'12px', color:'#6c757d', marginTop:'8px'}}>총 {filtered.length}명</p>
    </div>
  );
}