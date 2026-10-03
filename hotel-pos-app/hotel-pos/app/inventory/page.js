'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { sb } from '../../lib/supabase';

function Inventory() {
  const [rows, setRows] = useState([]);
  const load = async () => { const { data } = await sb.from('inventory_items').select('*').order('name'); setRows(data || []); };
  useEffect(() => { load(); }, []);
  async function restock(i) { const a = +prompt(`Add how many ${i.unit}?`, 5); if (a) { await sb.from('inventory_items').update({ qty: Number(i.qty) + a }).eq('id', i.id); load(); } }
  async function add() { const name = prompt('Item name'), unit = prompt('Unit (kg, l, pcs)', 'kg'), qty = +prompt('Opening stock', 0), min = +prompt('Low-stock level', 1); if (name) { await sb.from('inventory_items').insert({ name, unit, qty, min_qty: min }); load(); } }
  return (<><div className="bar-top"><h1>Inventory</h1><button className="primary" style={{ width: 'auto', padding: '9px 16px' }} onClick={add}>Add item</button></div>
    <p className="mu">Stock is deducted automatically from recipes when a KOT is sent.</p>
    <div className="card tbl"><table><thead><tr><th>Item</th><th>In stock</th><th>Low at</th><th></th></tr></thead><tbody>
      {rows.map((i) => { const low = Number(i.qty) <= Number(i.min_qty); return (<tr key={i.id}><td>{i.name}</td><td className={low ? 'lowt' : ''}>{Number(i.qty).toFixed(2)} {i.unit}{low ? ' (low)' : ''}</td><td>{i.min_qty} {i.unit}</td><td><button className="ghost" onClick={() => restock(i)}>Restock</button></td></tr>); })}</tbody></table></div></>);
}
export default function Page() { return <Shell><Inventory /></Shell>; }
