
import { useEffect, useState } from 'react';
import { apiService } from '../services/api'
import type { Campaign } from '../types';
import { Link } from 'react-router-dom';

export const CampaignsPage = () => {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', prefix: '', amountCents: 0, currency: 'SEK',
    validFrom: new Date().toISOString(), validTo: new Date(Date.now() + 90 * 86400000).toISOString()
  });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await apiService.listCampaigns()); setErr(null); 
    console.log(items)}
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createCampaign({
        name: form.name || undefined,
        prefix: form.prefix.trim().toUpperCase(),
        amountCents: Number(form.amountCents),
        currency: form.currency.trim().toUpperCase(),
        validFrom: form.validFrom,
        validTo: form.validTo,
      });
      setForm({ ...form, name: '', prefix: '', amountCents: 0 });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete campaign and all its vouchers?')) return;
    try { await apiService.deleteCampaign(id); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-2">Create campaign</h2>
        <form onSubmit={create} className="grid grid-cols-2 gap-3 max-w-3xl">
          <input className="border p-2 rounded" placeholder="Name (optional)" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input required className="border p-2 rounded" placeholder="PREFIX (A–Z)"
            value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} />
          <input required type="number" className="border p-2 rounded" placeholder="Amount (cents)"
            value={form.amountCents} onChange={e => setForm(f => ({ ...f, amountCents: +e.target.value }))} />
          <input required className="border p-2 rounded" placeholder="Currency (ISO)"
            value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
          <input required type="datetime-local" className="border p-2 rounded"
            value={form.validFrom.slice(0, 16)} onChange={e => setForm(f => ({ ...f, validFrom: new Date(e.target.value).toISOString() }))} />
          <input required type="datetime-local" className="border p-2 rounded"
            value={form.validTo.slice(0, 16)} onChange={e => setForm(f => ({ ...f, validTo: new Date(e.target.value).toISOString() }))} />
          <button className="col-span-2 bg-black text-white rounded p-2">Create</button>
        </form>
      </section>

      <section>
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-xl font-semibold">Campaigns</h2>
    <a
      href="/api/vouchers/all"
      className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800"
      download
    >
      Download all vouchers (CSV)
    </a>
  </div>

  {loading ? (
    <p>Loading…</p>
  ) : err ? (
    <p className="text-red-600">{err}</p>
  ) : (
    <table className="w-full border">
      <thead>
        <tr className="bg-gray-50">
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Prefix</th>
          <th className="p-2 text-left">Amount</th>
          <th className="p-2 text-left">Period</th>
          <th className='å-2 text-left'>Qtd</th>
          <th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id} className="border-t">
            <td className="p-2">{c.name || '—'}</td>
            <td className="p-2">{c.prefix}</td>
            <td className="p-2">
              {c.amountCents} {c.currency}
            </td>
            <td className="p-2">
              {c.validFrom.slice(0, 10)} → {c.validTo.slice(0, 10)}
            </td>
            <td className="p-2">{c.voucherCount ?? 0}</td>
            <td className="p-2 flex gap-2">
              <Link to={`/campaigns/${c.id}`} className="underline">
                Open
              </Link>
              <button
                onClick={() => del(c.id)}
                className="text-red-600 underline"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</section>
    </div>
  );
}
