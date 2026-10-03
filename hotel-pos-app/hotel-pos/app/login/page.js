'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setBusy(false); } else router.replace('/');
  }
  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <h1>Hotel POS</h1><p className="mu">Sign in to take orders and manage the kitchen.</p>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <div className="err">{err}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
