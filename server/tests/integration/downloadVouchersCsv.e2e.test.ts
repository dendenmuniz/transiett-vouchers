import express from 'express';
import request from 'supertest';

// ---- dataset shared between mocks and test
const store = {
  campaigns: new Map<string, { id: string; prefix: string; amountCents: number; currency: string }>(),
  vouchers: [] as Array<{ id: string; campaignId: string; code: string; createdAt: Date }>,
};

// ---- mocks of repo factories (must come before the handler import)
jest.mock('../../src/repositories/CampaignRepo', () => {
  return {
    CampaignRepo: () => ({
      async findById(id: string) {
        const c = store.campaigns.get(id);
        return c ? { ...c, name: null, validFrom: new Date(), validTo: new Date(), createdAt: new Date(), updatedAt: new Date() } : null;
      },
    }),
  };
});

jest.mock('../../src/repositories/VoucherRepo', () => {
  return {
    VoucherRepo: () => ({
      async listByCampaign({ campaignId, cursor }: { campaignId: string; cursor?: string; limit?: number }) {
        // stable ordering: createdAt desc, id desc
        let items = store.vouchers
          .filter(v => v.campaignId === campaignId)
          .sort((a, b) => {
            const t = b.createdAt.getTime() - a.createdAt.getTime();
            if (t !== 0) return t;
            return b.id.localeCompare(a.id);
          });

        
        if (cursor) {
          const idx = items.findIndex(x => x.id === cursor);
          if (idx >= 0) items = items.slice(idx + 1);
        }

        // forces pagination in BATCH OF 2 (ignores limit requested by handler)
        const page = items.slice(0, 2 + 1);
        let nextCursor: string | undefined;
        if (page.length > 2) {
          page.pop(); // remove extra
          nextCursor = page[page.length - 1]?.id;
        }
        return { items: page, nextCursor };
      },
    }),
  };
});


import { downloadVouchersCsv } from '../../src/controllers/VoucherController'; 

function buildApp() {
  const app = express();
  app.get('/api/campaigns/:campaignId/vouchers/export', downloadVouchersCsv);
  return app;
}

describe('downloadVouchersCsv', () => {
  beforeEach(() => {
    store.campaigns.clear();
    store.vouchers.length = 0;

    store.campaigns.set('C1', { id: 'C1', prefix: 'PX', amountCents: 999, currency: 'SEK' });

    // 4 vouchers in C1 (two pages of 2) + 1 in another campaign
    store.vouchers.push(
      { id: 'v1', campaignId: 'C1', code: 'PX-001', createdAt: new Date('2025-01-01') },
      { id: 'v2', campaignId: 'C1', code: 'PX-ABC', createdAt: new Date('2025-01-02') },
      { id: 'v3', campaignId: 'C1', code: 'PX-XYZ', createdAt: new Date('2025-01-03') },
      { id: 'v4', campaignId: 'C1', code: 'PX-DEF', createdAt: new Date('2025-01-03') },
      { id: 'o1', campaignId: 'C2', code: 'OT-999', createdAt: new Date('2025-01-04') },
    );
  });

  it('streams CSV with header and all campaign vouchers over multiple pages', async () => {
    const app = buildApp();

    const res = await request(app).get('/api/campaigns/C1/vouchers/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/i);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=/i);

    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('code,campaignId,prefix,amountCents,currency,createdAt');

   // must contain ONLY the 4 from C1
    const rows = lines.slice(1);
    expect(rows).toHaveLength(4);
    expect(rows.join('\n')).toContain('PX-001,C1,PX,999,SEK,');
    expect(rows.join('\n')).toContain('PX-ABC,C1,PX,999,SEK,');
    expect(rows.join('\n')).toContain('PX-XYZ,C1,PX,999,SEK,');
    expect(rows.join('\n')).toContain('PX-DEF,C1,PX,999,SEK,');
    expect(rows.join('\n')).not.toContain('OT-999'); // from another campaign
  });

  it('404 when campaign does not exist', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/campaigns/NOPE/vouchers/export');
    expect(res.status).toBe(404);
  });
});
