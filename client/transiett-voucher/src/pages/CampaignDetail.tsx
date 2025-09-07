import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Campaign, Voucher } from '../types';

export const CampaignDetail = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [limit, setLimit] = useState(50);
  const [count, setCount] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const page = cursors.length; // 1-based
  const totalPages =
    campaign?.voucherCount != null
      ? Math.max(1, Math.ceil((campaign.voucherCount || 0) / limit))
      : undefined;


  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const c = await apiService.getCampaign(id);
        setCampaign(c);
         setCursors([undefined]);                 // reset pagination 
        await loadPage(undefined);               // first pageprimeira página
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPage(cursor?: string) {
    if (!id) return;
    const page = await apiService.listVouchers(id, limit, cursor);
    setVouchers(page.items);
    setNextCursor(page.nextCursor || undefined);
  }

  async function goNext() {
    if (!nextCursor) return;
    const newStack = [...cursors, nextCursor];
    setCursors(newStack);
    await loadPage(nextCursor);
  }

  async function goPrev() {
    if (cursors.length <= 1) return; // first page
    const newStack = cursors.slice(0, -1);
    setCursors(newStack);
    await loadPage(newStack[newStack.length - 1]); // prev cursor 
  }

  async function gen() {
    if (!id) return;
    try {
      const r = await apiService.genVoucherBatch(id, count);
      alert(`Generated ${r.generatedCount}/${r.requestedCount} in ${r.durationMs} ms`);
      const c = await apiService.getCampaign(id); // refresh page
      setCampaign(c);
      //reset pagination and load first page
      setCursors([undefined]);
      await loadPage(undefined);
    } catch (e:any) {
      alert(e.message);
    }
  }

  if (!id) return <p>Invalid URL.</p>;
  if (loading) return <p>Loading…</p>;
  if (!campaign) return <p>Campaign not found.</p>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">{campaign.name || 'Campaign'}</h2>
        <p className="text-sm text-gray-600">
          Prefix {campaign.prefix} • {campaign.amountCents} {campaign.currency} • {campaign.validFrom.slice(0,10)} → {campaign.validTo.slice(0,10)} • Qtd {campaign.voucherCount}
           
        </p>
      </header>
      {(campaign.voucherCount ?? 0) == 0 && (
        <section className="flex items-end gap-3">
        <div>
          <label className="block text-sm">Batch size</label>
          <input type="number" value={count} onChange={e=>setCount(+e.target.value)} className="border p-2 rounded w-40"/>
        </div>
        <button onClick={gen} className="bg-black text-white rounded p-2">Generate vouchers</button>
        <a href={apiService.csvUrl(id)} className="underline" download>
          Download CSV
        </a>
      </section>)}
      

      <section>
        <div className="flex items-center gap-3 mb-2">
          <label className="text-sm">Page size</label>
            <input
            type="number"
            value={limit}
            onChange={async e => {
              const newLimit = Math.max(1, Number(e.target.value) || 50);
              setLimit(newLimit);
              setCursors([undefined]);           // reset if changed
              await loadPage(undefined);
            }}
            className="border p-1 rounded w-20"
          />
           <button onClick={() => loadPage(undefined)} className="border rounded px-2 py-1">Reload</button>
          <button onClick={goPrev} disabled={page <= 1} className="border rounded px-2 py-1 disabled:opacity-50">Prev</button>
          <button onClick={goNext} disabled={!nextCursor} className="border rounded px-2 py-1 disabled:opacity-50">Next</button>

          <div className="text-sm text-gray-700">
            Página <strong>{page}</strong>{totalPages ? <> de <strong>{totalPages}</strong></> : null}
            {/* opcional: indicador de estimativa */}
            {!nextCursor && totalPages && page < totalPages ? ' (estimado)' : null}
          </div>

           <a href={apiService.csvUrl(id)} className="ml-auto underline" download>
            Download CSV
          </a>

        </div>
        <table className="w-full border">
          <thead><tr className="bg-gray-50">
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Created</th>
          </tr></thead>
          <tbody>
            {vouchers.map(v=>(
              <tr key={v.id} className="border-t">
                <td className="p-2 font-mono">{v.code}</td>
                <td className="p-2">{v.createdAt?.slice(0,19).replace('T',' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}