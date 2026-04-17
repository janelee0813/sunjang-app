'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fa'}}>
      <div style={{background:'white',padding:'2.5rem',borderRadius:'12px',border:'1px solid #e9ecef',width:'100%',maxWidth:'380px'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <div style={{width:'48px',height:'48px',background:'#1a56db',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem',color:'white',fontSize:'10px',fontWeight:'500',textAlign:'center',lineHeight:'1.3',padding:'4px'}}>분당우리교회 4청년부</div>
          <h1 style={{fontSize:'18px',fontWeight:'500',margin:'0'}}>이종환 순</h1>
          <p style={{fontSize:'13px',color:'#6c757d',marginTop:'4px'}}>순원관리 시스템</p>
        </div>
        <div style={{marginBottom:'12px'}}>
          <label style={{fontSize:'12px',color:'#6c757d',display:'block',marginBottom:'4px'}}>이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" style={{width:'100%',padding:'10px 12px',border:'1px solid #dee2e6',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box' as const}}/>
        </div>
        <div style={{marginBottom:'20px'}}>
          <label style={{fontSize:'12px',color:'#6c757d',display:'block',marginBottom:'4px'}}>비밀번호</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 입력" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{width:'100%',padding:'10px 12px',border:'1px solid #dee2e6',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box' as const}}/>
        </div>
        {error && <p style={{fontSize:'13px',color:'#dc3545',background:'#fff5f5',padding:'10px 12px',borderRadius:'8px',marginBottom:'16px'}}>{error}</p>}
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'11px',background:loading?'#6c757d':'#1a56db',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  );
}