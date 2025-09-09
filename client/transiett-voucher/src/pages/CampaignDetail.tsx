import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Table, type Column, type Loader } from '../components/Table';
import type { Campaign, Voucher } from '../types';
import { apiService } from '../services/api';

export const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();

  // state
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [count, setCount] = useState(1000);
  const [refreshKey, setRefreshKey] = useState(0); // força reset da tabela após gerar

  // 🔹 Hooks SEMPRE no topo (antes de qualquer return)
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const c = await apiService.getCampaign(id);
        setCampaign(c);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // colunas da tabela (não dependem de campaign)
  const columns: Column<Voucher>[] = useMemo(
    () => [
      { header: 'Code', cell: (v) => <span className="font-mono">{v.code}</span> },
      { header: 'Created', cell: (v) => new Date(v.createdAt).toLocaleString() },
    ],
    []
  );

  // loader para vouchers desta campanha (usa cursor/limit/search do Table)
  const loader: Loader<Voucher> = async ({ cursor, limit, search }) => {
    if (!id) return { items: [], nextCursor: undefined };
    const res = await apiService.listVouchers(
      id,
      limit,
      cursor,
      search?.trim() || undefined
    );
    return {
      items: res.items,
      nextCursor: res.nextCursor ?? undefined,
      total: res.total,
    };
  };

  async function gen() {
    if (!id) return;
    const r = await apiService.genVoucherBatch(id, count);
    alert(`Generated ${r.generatedCount}/${r.requestedCount} in ${r.durationMs} ms`);
    const c = await apiService.getCampaign(id);
    setCampaign(c);
    setRefreshKey((k) => k + 1); // reseta a tabela (volta para página 1)
  }

  // ✅ Só agora os returns condicionais (nenhum hook depois disso)
  if (!id) return <p>Invalid URL.</p>;
  if (loading) return <p>Loading…</p>;
  if (!campaign) return <p>Campaign not found.</p>;

  const toolbarRight = (
    <div className="flex items-center gap-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search code…"
        className="border rounded-md px-3 py-2 text-sm"
      />
      <select
        value={pageSize}
        onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
        className="border rounded-md px-2 py-2 text-sm"
        title="Items per page"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <a
        href={apiService.csvUrl(id)}
        className="w-40 h-[40px] text-xs sm:text-base bg-gray-700 rounded-[5px] p-[7px_25px] gap-[10px] text-white"
        download
      >
        Download CSV
      </a>
    </div>
  );

  return (
    <div className="space-y-6 max-w-96 sm:max-w-4xl mx-auto border border-[#D1D5DB] rounded-lg p-8">
      <header className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-800">Campaign Details</h1>
          <Link to="/" className="w-16 h-[30px] text-xs sm:text-base bg-gray-700 rounded-[5px] p-[2px_15px] gap-[10px] text-white">Back</Link>
        </div>
      </header>

      <div className=" max-w-96 sm:max-w-4xl mx-auto border border-[#D1D5DB] rounded-lg p-8"> 
        <h2 className="text-xl font-semibold">{campaign.name || 'Campaign'}</h2> 
        <label className="text-sm font-medium text-gray-700 mb-1">Prefix</label>
        <p className="text-md xs:text-sm font-medium text-gray-900 mb-1 ">{campaign.prefix}</p> 
        <label className="text-sm font-medium text-gray-700 mb-1">Amount</label>
        <p className="text-md xs:text-sm font-medium text-gray-900 mb-1 ">{campaign.amountCents}</p>
         <p className="text-md xs:text-sm font-medium text-gray-900 mb-1 "><span className='text-sm font-medium text-gray-700'>Valid from</span> {campaign.validFrom.slice(0, 10)} to {campaign.validTo.slice(0, 10)}</p> 
         <p className="text-md xs:text-sm font-medium text-gray-900 mb-1 "><span className='text-sm font-medium text-gray-700'>Qtd vouchers</span> {campaign.voucherCount}</p> 
         
         </div>
    {(campaign?.voucherCount ?? 0) === 0  && (
      <div className="max-w-4xl mx-auto border border-gray-200 rounded-lg p-6">
        <section className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch size</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(+e.target.value)}
              className="h-10 rounded border border-gray-300 px-2"
            />
          </div>
          <button
            onClick={gen}
            className="h-10 bg-gray-700 text-white rounded px-4 hover:bg-gray-800"
          >
            Generate vouchers
          </button>
        </section>
      </div>
)}
      <section>
        <Table<Voucher>
          key={refreshKey}
          title="Vouchers"
          description="Browse vouchers for this campaign."
          columns={columns}
          loader={loader}
          pageSize={pageSize}
          search={search}
          toolbarRight={toolbarRight}
          emptyState={<span>No vouchers found</span>}
          getRowKey={(v) => v.id}
        />
      </section>
    </div>
  );
};
