'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { sb, inr } from '../../lib/supabase';

function Rooms() {
  const [rows, setRows] = useState([]);
  const load = async () => { const { data } = await sb.from('payments').select('id,amount,created_at,order_id,orders(location_id,locations(label))').eq('mode', 'room_charge').eq('settled', false); setRows(data || []); };
  useEffect(() => { load(); }, []);
  const by = {}; rows.forEach((r) => { const l = r.orders?.locations?.label; if (l) (by[l] = by[l] || { id: r.orders.location_id, list: [] }).list.push(r); });
  async function checkout(g) {
    const total = g.list.reduce((s, r) => s + Number(r.amount), 0);
    const mode = prompt(`Settle ${inr(total)} by: cash / upi / card`, 'cash'); if (!['cash', 'upi', 'card'].includes(mode)) return;
    await sb.from('settlements').insert({ location_id: g.id, amount: total, mode });
    await sb.from('payments').update({ settled: true }).in('id', g.list.map((r) => r.id)); load();
  }
  return (<><h1>Room folios</h1><div className="stats">
    {Object.entries(by).map(([label, g]) => (<div key={label} className="card"><h3>{label}</h3><div className="big">{inr(g.list.reduce((s, r) => s + Number(r.amount), 0))}</div>
      {g.list.map((r) => <div key={r.id} className="mu">Bill #{r.order_id} · {inr(r.amount)}</div>)}<br /><button className="primary" onClick={() => checkout(g)}>Checkout and settle</button></div>))}
    {!rows.length && <p className="mu">No pending room charges. Pay an order with "room charge" to post it here.</p>}</div></>);
}
export default function Page() { return <Shell><Rooms /></Shell>; }
