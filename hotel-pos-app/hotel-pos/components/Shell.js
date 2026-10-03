'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { sb } from '../lib/supabase';

export default function Shell({ children }) {
  const [ok, setOk] = useState(false);
  const [role, setRole] = useState('');
  const path = usePathname(), router = useRouter();
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.replace('/login');
      const { data: p } = await sb.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
      setRole(p?.role || 'waiter'); setOk(true);
    });
  }, [router]);
  if (!ok) return <div className="boot">Loading…</div>;
  const canSee = ['admin', 'manager', 'cashier'].includes(role);
  return (
    <>
      <header className="top">
        <div className="brand">Hotel POS</div>
        <nav>
          <Link className={path === '/' ? 'on' : ''} href="/">Orders</Link>
          <Link className={path === '/kitchen' ? 'on' : ''} href="/kitchen">Kitchen</Link>
          {canSee && <Link className={path === '/dashboard' ? 'on' : ''} href="/dashboard">Dashboard</Link>}
          {['admin', 'manager'].includes(role) && <Link className={path === '/menu' ? 'on' : ''} href="/menu">Menu</Link>}
          {canSee && <Link className={path === '/rooms' ? 'on' : ''} href="/rooms">Rooms</Link>}
          {['admin', 'manager'].includes(role) && <Link className={path === '/inventory' ? 'on' : ''} href="/inventory">Inventory</Link>}
        </nav>
        <button className="ghost" onClick={() => sb.auth.signOut().then(() => router.replace('/login'))}>Sign out</button>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
