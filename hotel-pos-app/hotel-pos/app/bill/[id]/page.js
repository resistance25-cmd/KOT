'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { sb, inr } from '../../../lib/supabase';

export default function Bill() {
  const { id } = useParams(); const [o, setO] = useState(null);
  useEffect(() => { sb.from('orders').select('*, locations(label), order_items(*), payments(*)').eq('id', id).single().then(({ data }) => setO(data)); }, [id]);
  if (!o) return <div className="boot">Loading bill…</div>;
  const items = o.order_items.filter((i) => !i.cancelled);
  const sub = items.reduce((s, i) => s + i.qty * i.price, 0);
  const gst = items.reduce((s, i) => s + i.qty * i.price * i.gst_percent / 100, 0);
  const total = Math.round(sub + gst - (o.discount || 0));
  return (
    <div className="bill">
      <style>{`@media print{.noprint{display:none}body{background:#fff}}.bill{max-width:300px;margin:16px auto;background:#fff;color:#000;padding:14px;font:12px/1.5 monospace}.bill hr{border:0;border-top:1px dashed #000}.bill .r{display:flex;justify-content:space-between}.bill h2{margin:0;text-align:center}.bill .c{text-align:center}`}</style>
      <h2>{process.env.NEXT_PUBLIC_HOTEL_NAME}</h2>
      <div className="c">{process.env.NEXT_PUBLIC_HOTEL_ADDRESS}<br />GSTIN: {process.env.NEXT_PUBLIC_HOTEL_GSTIN}</div><hr />
      <div className="r"><span>Bill #{o.id}</span><span>{o.locations?.label}</span></div>
      <div>{new Date(o.created_at).toLocaleString('en-IN')}</div><hr />
      {items.map((i) => <div key={i.id} className="r"><span>{i.qty} x {i.name}</span><span>{(i.qty * i.price).toFixed(2)}</span></div>)}<hr />
      <div className="r"><span>Subtotal</span><span>{sub.toFixed(2)}</span></div>
      <div className="r"><span>CGST</span><span>{(gst / 2).toFixed(2)}</span></div>
      <div className="r"><span>SGST</span><span>{(gst / 2).toFixed(2)}</span></div>
      {o.discount > 0 && <div className="r"><span>Discount</span><span>-{Number(o.discount).toFixed(2)}</span></div>}
      <div className="r"><b>TOTAL</b><b>{inr(total)}</b></div><hr />
      {o.payments.map((p) => <div key={p.id} className="r"><span>Paid ({p.mode.replace('_', ' ')})</span><span>{Number(p.amount).toFixed(2)}</span></div>)}
      <div className="c">Thank you, visit again</div>
      <button className="primary noprint" style={{ marginTop: 12 }} onClick={() => window.print()}>Print</button>
    </div>
  );
}
