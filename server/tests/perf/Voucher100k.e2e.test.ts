import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { CampaignRepo } from '../../src/repositories/CampaignRepo';
import { VoucherRepo } from '../../src/repositories/VoucherRepo';
import { GenerationBatchRepo } from '../../src/repositories/GenerationBatchRepo';
import { VoucherService } from '../../src/services/VoucherService';
import { downloadVouchersCsv } from '../../src/controllers/VoucherController';

const prisma = new PrismaClient();

// mini app só com a rota de export
function buildApp() {
  const app = express();
  app.get('/api/campaigns/:campaignId/vouchers/export', downloadVouchersCsv);
  return app;
}

const HEAVY = process.env.RUN_HEAVY === '1';

(HEAVY ? describe : describe.skip)('Perf: 100k vouchers', () => {
  beforeAll(() => {
    jest.setTimeout(300000); 
  });

  it('generates and downloads 100k vouchers end-to-end', async () => {
    const app = buildApp();

    const campaign = await prisma.campaign.create({
      data: {
        prefix: 'PERF',
        amountCents: 1000,
        currency: 'SEK',
        validFrom: new Date('2025-01-01'),
        validTo:   new Date('2025-12-31'),
      },
    });

    const svc = VoucherService({
      campaignRepo: CampaignRepo(prisma),
      voucherRepo:  VoucherRepo(prisma),
      batchRepo:    GenerationBatchRepo(prisma),
      chunkSize: 20000,   
      maxRetries: 5,
    });

    const t0 = Date.now();
    const genStart = Date.now();
    const genRes = await svc.generateBatch(campaign.id, 100_000);
    const genMs = Date.now() - genStart;
    expect(genRes.generatedCount).toBe(100_000);

    const csvStart = Date.now();
    const res = await request(app).get(`/api/campaigns/${campaign.id}/vouchers/export`).expect(200);
    const csvMs = Date.now() - csvStart;

    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('code,campaignId,prefix,amountCents,currency,createdAt');
    expect(lines.length).toBe(1 + 100_000); // header + rows

    const totalMs = Date.now() - t0;
    
     expect(genMs).toBeLessThan(10_000);  // < 10s generate
     expect(csvMs).toBeLessThan(6_000);   // < 6s export
     
  });
});
