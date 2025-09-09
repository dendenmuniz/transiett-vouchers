import { useState, useMemo } from 'react'
import { Table, type Column, type Loader } from '../components/Table'
import type { Voucher, VoucherWithCampaign } from '../types';
import { apiService } from '../services/api';

export const VouchersPage = () => {
  const [search, setSearch] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(50);


  const loader: Loader<VoucherWithCampaign> = async ({ cursor, limit, search }) => {
    const res = await apiService.listAllVouchers(limit, cursor, search);
    return {
      items: res.items,
      nextCursor: res.nextCursor ?? undefined,
      total: res.total,
    };
  };

  const columns: Column<VoucherWithCampaign>[] = useMemo(
    () => [
      { header: 'Code', cell: (v) => <span className="font-mono">{v.code}</span> },
      { header: 'Campaign', cell: (v) => <span>{v.campaignId}</span> },
      { header: 'Amount', cell: (v) => <span>{v.campaign.amountCents}</span> },
      { header: 'Currency', cell: (v) => <span>{v.campaign.currency}</span> },
      { header: 'Created At', cell: (v) => new Date(v.createdAt).toLocaleString() },
      { header: 'Valid To', cell: (v) => new Date(v.campaign.validTo).toLocaleString() },
    ],
    []
  );

  const toolbarRight = (
    <div className="flex items-center gap-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search code/prefix..."
        className="border rounded-md px-3 py-2 text-sm"
      />
      <select
        value={pageSize}
        onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
        className="border rounded-md px-2 py-2 text-sm"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  );


  return (
    <div className="space-y-6">
      <section>
        <Table<VoucherWithCampaign>
          title="Vouchers"
          description="Browse vouchers with cursor-based pagination."
          columns={columns}
          loader={loader}
          pageSize={pageSize}
          search={search}
          toolbarRight={toolbarRight}
          emptyState={<span>No vouchers found</span>}
        />
      </section>
    </div>
  )
}
