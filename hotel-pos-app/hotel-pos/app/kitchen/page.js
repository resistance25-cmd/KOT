'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell from '../../components/Shell';
import { sb } from '../../lib/supabase';

function Kitchen() {
  const [k, setK] = useState([]), [, tick] = useState(0);
  const load = useCallback(async () => { const { data } = await sb.from('kots').select('*, orders(locations(label))').eq('done', false).order('id'); setK(data || []); }, []);
  useEffect(() => { load(); const ch = sb.channel('kds').on('postgres_changes', { event: '*', schema: 'public', table: 'kots' }, load).subscribe(); const t = setInterval(() => tick((x) => x + 1), 30000); return () => { sb.removeChannel(ch); clearInterval(t); }; }, [load]);
  const done = async (id) => { await sb.from('kots').update({ done: true }).eq('id', id); load(); };
  return (<><h1>Kitchen</h1>
    <div className="stats">{k.map((x) => { const m = Math.floor((Date.now() - new Date(x.created_at)) / 60000);
      return (<div key={x.id} className={`card kd ${m > 10 ? 'late' : ''}`}><b>{x.orders?.locations?.label}</b> <span className="mu">KOT #{x.id} · {m} min</span>
        <div className="kl">{x.items.map((i, n) => <div key={n}>{i.qty} × {i.name}{i.note ? <span className="mu"> ({i.note})</span> : null}</div>)}</div>
        <button className="primary" onClick={() => done(x.id)}>Done</button></div>); })}
      {!k.length && <p className="mu">No pending orders.</p>}</div></>);
}
export default function Page() { return <Shell><Kitchen /></Shell>; }
