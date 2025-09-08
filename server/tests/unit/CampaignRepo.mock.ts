import { randomUUID } from 'crypto';
import type { Campaign } from '@prisma/client';
import type { CampaignRepo as CampaignRepoApi } from '../../src/repositories/CampaignRepo';

export function makeInMemoryCampaignRepo(): CampaignRepoApi & {
  _dump(): Map<string, Campaign>;
} {
  const store = new Map<string, Campaign>();

  return {
    async create(data) {
      const now = new Date();
      const c: Campaign = {
        id: randomUUID(),
        name: data.name ?? null,
        prefix: data.prefix,
        amountCents: data.amountCents,
        currency: data.currency,
        validFrom: data.validFrom,
        validTo: data.validTo,
        createdAt: now,
        updatedAt: now,
      };
      store.set(c.id, c);
      return c;
    },

    async findById(id) {
      return store.get(id) ?? null;
    },

    async list({ search, cursor, limit = 20 }) {
      let items = Array.from(store.values());

      if (search && search.trim()) {
        const q = search.toLowerCase();
        items = items.filter(
          c =>
            (c.name ?? '').toLowerCase().includes(q) ||
            c.prefix.toLowerCase().includes(q),
        );
      }

     
      items.sort((a, b) => {
        const t = b.createdAt.getTime() - a.createdAt.getTime();
        if (t !== 0) return t;
        return b.id.localeCompare(a.id);
      });

      
      if (cursor) {
        const idx = items.findIndex(c => c.id === cursor);
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

    async deleteById(id) {
      store.delete(id);
    },

    _dump() {
      return store;
    },
  };
}
