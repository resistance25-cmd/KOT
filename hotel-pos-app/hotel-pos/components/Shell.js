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
  const cash = ['admin', 'manager', 'cashier'].includes(role), mgr = ['admin', 'manager'].includes(role);
  const links = [['/', 'Orders', true], ['/kitchen', 'Kitchen', true], ['/rooms', 'Rooms', cash], ['/dashboard', 'Dashboard', cash], ['/menu', 'Menu', mgr], ['/inventory', 'Inventory', mgr]];
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">{process.env.NEXT_PUBLIC_HOTEL_NAME || 'Hotel POS'}<small>Restaurant and rooms</small></div>
        <nav>{links.filter((l) => l[2]).map(([h, t]) => <Link key={h} href={h} className={path === h ? 'on' : ''}>{t}</Link>)}</nav>
        <button className="out" onClick={() => sb.auth.signOut().then(() => router.replace('/login'))}>Sign out</button>
      </aside>
      <main className="wrap">{children}</main>
    </div>
  );
}
