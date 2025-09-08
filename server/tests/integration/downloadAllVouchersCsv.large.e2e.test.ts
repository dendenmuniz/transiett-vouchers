import express from 'express';
import request from 'supertest';

// ---------- shared dataset for the mock ----------
const store = {
  campaigns: new Map<string, { id: string; prefix: string; amountCents: number; currency: string }>(),
  vouchers: [] as Array<{ id: string; campaignId: string; code: string; createdAt: Date }>,
};

// ---------- mocks (define BEFORE importing the handler) ----------
jest.mock('../../src/repositories/VoucherRepo', () => {
  return {
    VoucherRepo: () => ({
      async listAll({ cursor }: { cursor?: string; limit?: number }) {
        let items = [...store.vouchers].sort((a, b) => {
          const t = b.createdAt.getTime() - a.createdAt.getTime();
          if (t !== 0) return t;
          return b.id.localeCompare(a.id);
        });

        if (cursor) {
          const idx = items.findIndex(x => x.id === cursor);
          if (idx >= 0) items = items.slice(idx + 1);
        }

        // forces pagination with fixed CHUNK (independent of handler limit)
        const CHUNK = 128;
        const page = items.slice(0, CHUNK + 1);

        let nextCursor: string | undefined;
        if (page.length > CHUNK) {
          page.pop(); // remove the lookahead
          nextCursor = page[page.length - 1]?.id; // cursor = last RETURNED
        }

        const withCampaign = page.map(v => ({
          ...v,
          campaign: store.campaigns.get(v.campaignId)!,
        }));

        return { items: withCampaign, nextCursor };
      },
    }),
  };
});


import { downloadAllVouchersCsv } from '../../src/controllers/VoucherController'; 

function buildApp() {
  const app = express();
  app.get('/api/vouchers/export/all', downloadAllVouchersCsv);
  return app;
}

describe('downloadAllVouchersCsv (large)', () => {
  beforeEach(() => {
    store.campaigns.clear();
    store.vouchers.length = 0;

    store.campaigns.set('C1', { id: 'C1', prefix: 'PX', amountCents: 999, currency: 'SEK' });
    store.campaigns.set('C2', { id: 'C2', prefix: 'OT', amountCents: 500, currency: 'SEK' });

    // generates 1234 vouchers distributed between C1 and C2, with unique and increasing createdAt
    const N = 1234;
    const base = new Date('2025-01-01T00:00:00Z').getTime();
    for (let i = 0; i < N; i++) {
      const isC1 = i % 2 === 0;
      const cId = isC1 ? 'C1' : 'C2';
      const prefix = isC1 ? 'PX' : 'OT';
      const id = `v${String(i).padStart(6, '0')}`;
      store.vouchers.push({
        id,
        campaignId: cId,
        code: `${prefix}-${String(i).padStart(6, '0')}`,
        createdAt: new Date(base + i * 1000), // 1s difference
      });
    }
  });

  it('streams CSV header and all rows across many pages', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/vouchers/export/all');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/i);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=/i);

    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('code,campaignId,prefix,amountCents,currency,createdAt');

    const rows = lines.slice(1);
    expect(rows.length).toBe(1234); // all exported lines

    // content spot-check (different prefixes and amounts per campaign)
    const joined = rows.join('\n');
    expect(joined).toContain(',C1,PX,999,SEK,');
    expect(joined).toContain(',C2,OT,500,SEK,');
    // some specific codes that should appear
    expect(joined).toContain('PX-000000,C1,');
    expect(joined).toContain('OT-000001,C2,');
  });
});
