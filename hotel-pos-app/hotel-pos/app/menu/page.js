'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { sb, inr } from '../../lib/supabase';

function MenuAdmin() {
  const [items, setItems] = useState([]), [cats, setCats] = useState([]);
  const [f, setF] = useState({ name: '', price: '', category_id: '', gst_percent: 5 });
  const load = async () => {
    const [m, c] = await Promise.all([sb.from('menu_items').select('*').order('category_id').order('name'), sb.from('menu_categories').select('*').order('id')]);
    setItems(m.data || []); setCats(c.data || []); if (!f.category_id && c.data?.[0]) setF((x) => ({ ...x, category_id: c.data[0].id }));
  };
  useEffect(() => { load(); }, []);
  const upd = async (id, patch) => { await sb.from('menu_items').update(patch).eq('id', id); load(); };
  async function add(e) {
    e.preventDefault();
    await sb.from('menu_items').insert({ name: f.name, price: +f.price, category_id: +f.category_id, gst_percent: +f.gst_percent });
    setF({ ...f, name: '', price: '' }); load();
  }
  return (
    <>
      <h1>Menu</h1>
      <form className="card mform" onSubmit={add}>
        <input placeholder="Dish name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input type="number" placeholder="Price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required />
        <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input type="number" placeholder="GST %" value={f.gst_percent} onChange={(e) => setF({ ...f, gst_percent: e.target.value })} />
        <button className="primary">Add dish</button>
      </form>
      <div className="card tbl" style={{ marginTop: 14 }}>
        <table><thead><tr><th>Dish</th><th>Category</th><th>Price</th><th>GST %</th><th>Available</th></tr></thead>
          <tbody>{items.map((m) => (
            <tr key={m.id}><td>{m.name}</td><td>{cats.find((c) => c.id === m.category_id)?.name}</td>
              <td><input className="sm" type="number" defaultValue={m.price} onBlur={(e) => +e.target.value !== +m.price && upd(m.id, { price: +e.target.value })} /></td>
              <td>{m.gst_percent}</td>
              <td><button className={`chip ${m.available ? 'on' : ''}`} onClick={() => upd(m.id, { available: !m.available })}>{m.available ? 'In stock' : 'Out'}</button></td></tr>))}</tbody></table>
      </div>
    </>
  );
}
export default function Page() { return <Shell><MenuAdmin /></Shell>; }
