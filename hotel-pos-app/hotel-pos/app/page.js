'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell from '../components/Shell';
import { sb, inr, lineTotal } from '../lib/supabase';

function POS() {
  const [locs, setLocs] = useState([]), [menu, setMenu] = useState([]), [cats, setCats] = useState([]);
  const [loc, setLoc] = useState(null), [order, setOrder] = useState(null), [items, setItems] = useState([]);
  const [cat, setCat] = useState(0), [busyLocs, setBusyLocs] = useState([]), [msg, setMsg] = useState(''), [reqs, setReqs] = useState([]);

  useEffect(() => { (async () => {
    const [l, m, c] = await Promise.all([sb.from('locations').select('*').order('label'), sb.from('menu_items').select('*').eq('available', true).order('name'), sb.from('menu_categories').select('*').order('id')]);
    setLocs(l.data || []); setMenu(m.data || []); setCats(c.data || []); setLoc(l.data?.[0] || null);
  })(); }, []);

  const load = useCallback(async () => {
    if (!loc) return;
    const { data: o } = await sb.from('orders').select('*').eq('location_id', loc.id).eq('status', 'open').maybeSingle();
    setOrder(o);
    if (o) { const { data } = await sb.from('order_items').select('*').eq('order_id', o.id).eq('cancelled', false).order('id'); setItems(data || []); } else setItems([]);
    const { data: ob } = await sb.from('orders').select('location_id').eq('status', 'open'); setBusyLocs((ob || []).map((x) => x.location_id));
    const { data: rq } = await sb.from('guest_requests').select('*').eq('location_id', loc.id).eq('status', 'pending'); setReqs(rq || []);
  }, [loc]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const ch = sb.channel('orders-live').on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'guest_requests' }, load).subscribe(); return () => { sb.removeChannel(ch); }; }, [load]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };
  async function remove(id) { await sb.from('order_items').delete().eq('id', id); load(); }
  async function discount() {
    const a = +prompt('Discount amount (₹)'); if (!a) return;
    const { error } = await sb.rpc('apply_discount', { p_order: order.id, p_amount: a, p_pin: prompt('Manager PIN') });
    flash(error ? 'Wrong PIN, discount not applied' : 'Discount applied'); load();
  }
  async function add(m) {
    let o = order;
    if (!o) { const { data } = await sb.from('orders').insert({ type: loc.kind === 'room' ? 'room_service' : 'dine_in', location_id: loc.id }).select().single(); o = data; }
    const same = items.find((i) => i.item_id === m.id && !i.kot_id);
    if (same) await sb.from('order_items').update({ qty: same.qty + 1 }).eq('id', same.id);
    else await sb.from('order_items').insert({ order_id: o.id, item_id: m.id, name: m.name, qty: 1, price: m.price, gst_percent: m.gst_percent });
    load();
  }
  async function accept(r) {
    let o = order;
    if (!o) { const { data } = await sb.from('orders').insert({ type: loc.kind === 'room' ? 'room_service' : 'dine_in', location_id: loc.id }).select().single(); o = data; }
    await sb.from('order_items').insert(r.items.map((i) => ({ order_id: o.id, item_id: i.id, name: i.name, qty: i.qty, price: i.price, gst_percent: i.gst_percent, note: r.note || null })));
    await sb.from('guest_requests').update({ status: 'accepted' }).eq('id', r.id); flash('Guest order added'); load();
  }
  async function sendKot() {
    const fresh = items.filter((i) => !i.kot_id); if (!fresh.length) return;
    const { data: k } = await sb.from('kots').insert({ order_id: order.id, items: fresh.map((i) => ({ name: i.name, qty: i.qty, note: i.note })) }).select().single();
    await sb.from('order_items').update({ kot_id: k.id }).in('id', fresh.map((i) => i.id));
    flash('KOT sent to kitchen'); load();
  }
  async function pay(mode) {
    const amount = Math.round(items.reduce((s, i) => s + lineTotal(i), 0) - (order?.discount || 0));
    await sb.from('payments').insert({ order_id: order.id, mode, amount });
    await sb.from('orders').update({ status: 'paid', closed_at: new Date().toISOString() }).eq('id', order.id);
    flash(`Paid ${inr(amount)} by ${mode.replace('_', ' ')}`); load();
  }
  const total = Math.round(items.reduce((s, i) => s + lineTotal(i), 0) - (order?.discount || 0));
  const shown = menu.filter((m) => !cat || m.category_id === cat);
  const unsent = items.some((i) => !i.kot_id);

  return (
    <div className="pos">
      <section>
        <div className="chips">{locs.map((l) => (
          <button key={l.id} className={`chip ${loc?.id === l.id ? 'on' : ''} ${busyLocs.includes(l.id) ? 'busy' : ''}`} onClick={() => setLoc(l)}>{l.label}</button>))}</div>
        <div className="chips sub">
          <button className={`chip ${!cat ? 'on' : ''}`} onClick={() => setCat(0)}>All</button>
          {cats.map((c) => <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.name}</button>)}
        </div>
        <div className="menu">{shown.map((m) => (
          <button key={m.id} className="dish" onClick={() => add(m)}><span>{m.name}</span><b>{inr(m.price)}</b></button>))}</div>
      </section>
      <aside className="card ticket">
        <h2>{loc?.label || '—'}</h2>
        {reqs.map((r) => (<div key={r.id} className="req"><span>Guest order: {r.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}{r.note ? ` (${r.note})` : ''}</span><button onClick={() => accept(r)}>Accept</button></div>))}
        <div className="lines">{items.length === 0 && <p className="mu">Tap a dish to start an order.</p>}
          {items.map((i) => (<div key={i.id} className="line"><span>{i.qty} × {i.name}</span><span className="mu">{i.kot_id ? 'sent' : 'new'}</span><b>{inr(lineTotal(i))}</b>{!i.kot_id && <button className="x" onClick={() => remove(i.id)}>✕</button>}</div>))}</div>
        {order?.discount > 0 && <div className="line"><span>Discount</span><span></span><b>-{inr(order.discount)}</b></div>}
        <div className="sum"><span>Total incl. GST</span><b>{inr(total)}</b></div>
        <button className="primary" disabled={!unsent} onClick={sendKot}>Send KOT</button>
        {order && items.length > 0 && <a className="ghost bl" href={`/bill/${order.id}`} target="_blank" rel="noreferrer">Print bill</a>}
        {order && items.length > 0 && <button className="ghost" onClick={discount}>Discount (manager PIN)</button>}
        <div className="pay">{['cash', 'upi', 'card', 'room_charge'].map((m) => (<button key={m} disabled={!items.length} onClick={() => pay(m)}>{m.replace('_', ' ')}</button>))}</div>
        {msg && <div className="toast">{msg}</div>}
      </aside>
    </div>
  );
}
export default function Page() { return <Shell><POS /></Shell>; }
