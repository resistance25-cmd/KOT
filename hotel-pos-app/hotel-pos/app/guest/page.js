'use client';
import { useEffect, useState } from 'react';
import { sb, inr } from '../../lib/supabase';

export default function Guest() {
  const [loc, setLoc] = useState(null), [menu, setMenu] = useState([]), [cart, setCart] = useState({}), [note, setNote] = useState(''), [done, setDone] = useState(false);
  useEffect(() => { (async () => {
    const t = new URLSearchParams(window.location.search).get('t');
    const [l, m] = await Promise.all([sb.from('locations').select('*').eq('id', t).maybeSingle(), sb.from('menu_items').select('*').eq('available', true).order('name')]);
    setLoc(l.data); setMenu(m.data || []);
  })(); }, []);
  const set = (id, d) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));
  const lines = menu.filter((m) => cart[m.id] > 0);
  const total = lines.reduce((s, m) => s + cart[m.id] * m.price * (1 + m.gst_percent / 100), 0);
  async function place() {
    const items = lines.map((m) => ({ id: m.id, name: m.name, qty: cart[m.id], price: m.price, gst_percent: m.gst_percent }));
    const { error } = await sb.from('guest_requests').insert({ location_id: loc.id, items, note });
    if (!error) setDone(true);
  }
  if (done) return <div className="login"><div className="card"><h1>Order sent</h1><p className="mu">The restaurant team will confirm it shortly.</p></div></div>;
  if (!loc) return <div className="boot">Loading menu…</div>;
  return (
    <div className="wrap" style={{ maxWidth: 520, paddingBottom: 120 }}>
      <h1>Menu</h1><p className="mu">Ordering for {loc.label}</p>
      {menu.map((m) => (
        <div key={m.id} className="card gline"><div><b>{m.name}</b><div className="mu">{inr(m.price)}</div></div>
          <div className="qty"><button onClick={() => set(m.id, -1)}>−</button><span>{cart[m.id] || 0}</span><button onClick={() => set(m.id, 1)}>+</button></div></div>))}
      {lines.length > 0 && (
        <div className="gbar"><input placeholder="Any note for the kitchen?" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="primary" onClick={place}>Place order · {inr(total)}</button></div>)}
    </div>
  );
}
