import { randomUUID } from 'crypto';
import type { Voucher } from '@prisma/client';
import type { VoucherRepo as VoucherRepoApi } from '../../src/repositories/VoucherRepo';


export function makeInMemoryVoucherRepo(opts?: {
  getCampaign?: (id: string) =>
    | { prefix: string; amountCents: number; currency: string }
    | null;
}) : VoucherRepoApi & {
  _state: { vouchers: Map<string, Voucher> };

  _deleteByCampaign(campaignId: string): void;
} {
  const vouchers = new Map<string, Voucher>();

  function stableSort(a: Voucher, b: Voucher) {
    const t = b.createdAt.getTime() - a.createdAt.getTime();
    if (t !== 0) return t;
    return b.id.localeCompare(a.id); // tie-breaker
  }

  return {
    async bulkInsert(records) {
      let created = 0;
      for (const r of records) {
        const exists = [...vouchers.values()].some(v => v.code === r.code);
        if (exists) continue;
        const v: Voucher = {
          id: randomUUID(),
          campaignId: r.campaignId,
          code: r.code,
          createdAt: r.createdAt,
        };
        vouchers.set(v.id, v);
        created++;
      }
      return { count: created };
    },

    async findById(id) {
      return vouchers.get(id) ?? null;
    },

    async listByCampaign({ campaignId, search, cursor, limit = 20 }) {
      let items = [...vouchers.values()].filter(v =>
        (campaignId ? v.campaignId === campaignId : true) &&
        (search ? v.code.toLowerCase().includes(search.toLowerCase()) : true)
      );

      items.sort(stableSort);

      if (cursor) {
        const idx = items.findIndex(i => i.id === cursor);
        if (idx >= 0) items = items.slice(idx + 1);
      }

      const page = items.slice(0, limit + 1);
      let nextCursor: string | undefined;
      if (page.length > limit) {
        page.pop();
        nextCursor = page[page.length - 1]?.id;
      }

      return { items: page, nextCursor };
    },

    async delete(id) {
      vouchers.delete(id);
    },

    async listAll({ cursor, limit = 1000, search }) {
      let items = [...vouchers.values()].filter(v =>
        search ? v.code.toLowerCase().includes(search.toLowerCase()) : true
      );

      items.sort(stableSort);

      if (cursor) {
        const idx = items.findIndex(i => i.id === cursor);
        if (idx >= 0) items = items.slice(idx + 1);
      }

      const page = items.slice(0, limit + 1);
      let nextCursor: string | undefined;
      if (page.length > limit) {
        page.pop();
        nextCursor = page[page.length - 1]?.id;
      }

      const withCampaign = page.map(v => ({
        ...v,
        campaign: opts?.getCampaign?.(v.campaignId) ?? { prefix: '', amountCents: 0, currency: '' },
      }));

      return { items: withCampaign as any, nextCursor };
    },

    _state: { vouchers },

    _deleteByCampaign(campaignId: string) {
      for (const [id, v] of vouchers.entries()) {
        if (v.campaignId === campaignId) vouchers.delete(id);
      }
    },
  };
}