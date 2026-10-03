'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { sb, inr } from '../../lib/supabase';

function Dash() {
  const [days, setDays] = useState(1), [rows, setRows] = useState([]), [gstv, setGstv] = useState(0), [pend, setPend] = useState(0), [setl, setSetl] = useState([]);
  useEffect(() => { (async () => {
    const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - (days - 1));
    const { data } = await sb.from('payments').select('id,amount,mode,created_at,order_id,orders(type,locations(label))').gte('created_at', from.toISOString()).order('created_at', { ascending: false });
    setRows(data || []);
    const { data: o } = await sb.from('orders').select('order_items(qty,price,gst_percent,cancelled)').eq('status', 'paid').gte('closed_at', from.toISOString());
    setGstv((o || []).flatMap((x) => x.order_items).filter((i) => !i.cancelled).reduce((s, i) => s + i.qty * i.price * i.gst_percent / 100, 0));
    const { data: st } = await sb.from('settlements').select('amount,mode').gte('created_at', from.toISOString()); setSetl(st || []);
    const { data: pr } = await sb.from('payments').select('amount').eq('mode', 'room_charge').eq('settled', false); setPend((pr || []).reduce((s, r) => s + Number(r.amount), 0));
  })(); }, [days]);
  const sum = rows.reduce((s, r) => s + Number(r.amount), 0);
  const by = {}, hr = Array(24).fill(0);
  rows.forEach((r) => { if (r.mode !== 'room_charge') by[r.mode] = (by[r.mode] || 0) + Number(r.amount); hr[new Date(r.created_at).getHours()] += Number(r.amount); });
  setl.forEach((x) => { by[x.mode] = (by[x.mode] || 0) + Number(x.amount); });
  const mx = Math.max(1, ...Object.values(by)), hm = Math.max(1, ...hr);
  const orders = new Set(rows.map((r) => r.order_id)).size;
  return (
    <>
      <div className="bar-top"><h1>Dashboard</h1>
        <div className="chips">{[[1, 'Today'], [7, '7 days'], [30, '30 days']].map(([d, l]) => (<button key={d} className={`chip ${days === d ? 'on' : ''}`} onClick={() => setDays(d)}>{l}</button>))}</div></div>
      <div className="strip">
        <div className="card"><span className="mu">Sales</span><div className="big">{inr(sum)}</div></div>
        <div className="card"><span className="mu">Orders</span><div className="big">{orders}</div></div>
        <div className="card"><span className="mu">Avg order</span><div className="big">{inr(orders ? sum / orders : 0)}</div></div>
        <div className="card"><span className="mu">GST collected</span><div className="big">{inr(gstv)}</div><span className="mu">CGST {inr(gstv / 2)} · SGST {inr(gstv / 2)}</span></div>
        <div className="card"><span className="mu">Room charges pending</span><div className="big">{inr(pend)}</div></div>
      </div>
      <div className="two">
        <div className="card"><h3>How payments were received</h3>
          {Object.entries(by).map(([k, v]) => (<div key={k} className="meter"><div><span>{k.replace('_', ' ')}</span><b>{inr(v)}</b></div><i style={{ width: `${(v / mx) * 100}%` }} /></div>))}
          {!rows.length && <p className="mu">No payments yet.</p>}</div>
        <div className="card"><h3>Sales by hour</h3>
          <svg viewBox="0 0 240 90" width="100%" role="img" aria-label="Sales by hour">{hr.map((v, i) => (<rect key={i} x={i * 10} y={80 - (v / hm) * 70} width="8" height={(v / hm) * 70} rx="2" fill="var(--ac)" />))}</svg></div>
      </div>
      <div className="card tbl"><h3>Order history</h3>
        <table><thead><tr><th>Time</th><th>Order</th><th>Location</th><th>Payment</th><th>Amount</th></tr></thead>
          <tbody>{rows.slice(0, 50).map((r) => (<tr key={r.id}><td>{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td><td>#{r.order_id}</td><td>{r.orders?.locations?.label}</td><td>{r.mode.replace('_', ' ')}</td><td>{inr(r.amount)}</td></tr>))}</tbody></table></div>
    </>
  );
}
export default function Page() { return <Shell><Dash /></Shell>; }
