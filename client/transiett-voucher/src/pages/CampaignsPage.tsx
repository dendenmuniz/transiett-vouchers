import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, type Column, type Loader } from '../components/Table';
import type { Campaign } from '../types';
import { apiService } from '../services/api';

export const CampaignsPage = () => {
  // UI controls
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // create form state
  const [form, setForm] = useState({
    name: '',
    prefix: '',
    amountCents: 0,
    currency: 'SEK',
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 90 * 86400000).toISOString(),
  });

  const loader: Loader<Campaign> = async ({ cursor, limit, search }) => {
    const res = await apiService.listCampaigns(limit, cursor, search?.trim() || undefined);
    if (Array.isArray(res)) {
      return { items: res, nextCursor: undefined };
    }
    return {
      items: res.items,
      nextCursor: res.nextCursor ?? undefined,
      total: res.total,
    };
  };

  const toClientError = (err: any): { message: string; fieldErrors: Record<string, string> } => {
    let message = 'Something went wrong. Try again, please.';
    const fieldErrors: Record<string, string> = {};

    const data = err?.response?.data ?? err?.data ?? err;
    if (data) {
      if (typeof data.message === 'string') message = data.message;

      const issues = data?.details?.issues
        ?? data?.issues
        ?? data?.errors
        ?? [];
      if (Array.isArray(issues)) {
        for (const it of issues) {
          const path = typeof it?.path === 'string'
            ? it.path
            : Array.isArray(it?.path) ? it.path.join('.') : '';
          const msg = it?.message ?? it?.code ?? 'Inválido';
          if (path) fieldErrors[path] = msg;
        }
      }
      if (data.fieldErrors && typeof data.fieldErrors === 'object') {
        Object.assign(fieldErrors, data.fieldErrors);
      }
    }

    return { message, fieldErrors };
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    try {
      await apiService.createCampaign({
        name: form.name,
        prefix: form.prefix.trim().toUpperCase(),
        amountCents: Number(form.amountCents),
        currency: form.currency.trim().toUpperCase(),
        validFrom: form.validFrom,
        validTo: form.validTo,
      });
      setForm((f) => ({ ...f, name: '', prefix: '', amountCents: 0 }));
      setRefreshKey((k) => k + 1); // recarrega a tabela
    } catch (err) {
      const { message, fieldErrors } = toClientError(err);
      setFormError(message);
      setErrors(fieldErrors);
      console.log(errors)
      const first = Object.keys(fieldErrors)[0];
      if (first) document.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    } finally {
      setSubmitting(false)
    }
  }

  async function del(id: string) {
    if (!confirm('Delete campaign and all its vouchers?')) return;
    await apiService.deleteCampaign(id);
    setRefreshKey((k) => k + 1);
  }

  const columns: Column<Campaign>[] = [
    {
      header: 'Name',
      cell: (c) => (c.name ? c.name : '—'),
    },
    {
      header: 'Prefix',
      cell: (c) => c.prefix,
    },
    {
      header: 'Amount',
      cell: (c) => (
        <span>
          {c.amountCents} {c.currency}
        </span>
      ),
    },
    {
      header: 'Period',
      cell: (c) => (
        <span>
          {c.validFrom.slice(0, 10)} → {c.validTo.slice(0, 10)}
        </span>
      ),
    },
    {
      header: 'Qtd',
      className: 'text-right',
      cell: (c) => <span className="tabular-nums">{c.voucherCount ?? 0}</span>,
    },
    {
      header: '',
      className: 'text-right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-3">
          <Link to={`/campaigns/${c.id}`} className="text-indigo-600 hover:underline">
            Open
          </Link>
          <button onClick={() => del(c.id)} className="text-red-600 hover:underline">
            Delete
          </button>
        </div>
      ),
    },
  ];

  const toolbarRight = (
    <div className="flex items-center gap-2">

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name/prefix…"
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
    </div>
  );

  return (
    <div className="space-y-6 w-full border border-gray-200 p-4 rounded-[5px]">
      <div className="p-6 ">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Campaigns</h1>
          </div>

        </div>
      </div>
      {/* Create form */}
      <section className='p-6 border-b border-gray-200 '>


        <div className=" max-w-96 sm:max-w-4xl mx-auto border border-[#D1D5DB] rounded-lg p-8">
          <h2 className="text-xl font-semibold mb-2">Create a new campaign</h2>
          <form onSubmit={create} className="grid grid-cols-2 gap-3 max-w-3xl ">
            <input
              className="h-[50px] rounded-[5px] text-md xs:text-sm border border-[#D1D5DB] w-full px-2"
              placeholder="Name (optional)"
              value={form.name}
              name="name"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              required
              className="h-[50px] rounded-[5px] text-md xs:text-sm border border-[#D1D5DB] w-full px-2"
              placeholder="PREFIX (A–Z)"
              value={form.prefix}
              name="prefix"

              onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
            />


            <input
              required
              type="number"
              className="h-[50px] rounded-[5px] text-md xs:text-sm border border-[#D1D5DB] w-full px-2"
              placeholder="Amount (cents)"
              name="amountCents"
              value={form.amountCents}
              onChange={(e) => setForm((f) => ({ ...f, amountCents: +e.target.value }))}
            />

            <input
              required
              className="h-[50px] rounded-[5px] text-md xs:text-sm border border-[#D1D5DB] w-full px-2"
              placeholder="Currency (ISO)"
              value={form.currency}
              name="currency"
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            />


            <input
              required
              name="validFrom"
              type="datetime-local"
              className="h-[50px] rounded-[5px] text-md xs:text-sm border border-[#D1D5DB] w-full px-2"
              value={form.validFrom.slice(0, 16)}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: new Date(e.target.value).toISOString() }))}
            />


            <input
              required
              name="validTo"
              type="datetime-local"
              className="h-[50px] rounded-[5px] text-md xs:text-sm border border-[#D1D5DB] w-full px-2"
              value={form.validTo.slice(0, 16)}
              onChange={(e) => setForm((f) => ({ ...f, validTo: new Date(e.target.value).toISOString() }))}
            />


            <button disabled={submitting}
              className="w-32 h-[50px] text-xs sm:text-base bg-gray-700 rounded-[5px] p-[13px_25px] gap-[10px] text-white">
              {submitting ? 'Creating…' : 'Create'}
            </button>

          </form>
          {formError && (

            <div className="flex items-center p-4 mt-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-100 dark:text-red-400" role="alert">
              <svg className="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
              </svg>
              <span className="sr-only">Info</span>
              <div>
                {formError}
              </div>
            </div>

          )}
        </div>
      </section>

      {/* Tabela com paginação por cursor */}
      <section>
        <Table<Campaign>
          key={refreshKey}
          title="Campaigns"
          description="Manage voucher campaigns"
          columns={columns}
          loader={loader}
          pageSize={pageSize}
          search={search}
          toolbarRight={toolbarRight}
          emptyState={<span>No campaigns found</span>}
          getRowKey={(c) => c.id}
        />
      </section>
    </div>
  );
};
