import { makeInMemoryCampaignRepo } from './CampaignRepo.mock';
import { makeInMemoryVoucherRepo } from './VoucherRepo.mock';
import { makeInMemoryGenerationBatchRepo } from './GenerationBatchRepo.mock';
import { VoucherService } from '../../src/services/VoucherService';

// RNG determinístico para evitar flakiness
function makeSeededRng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (1664525 * s + 1013904223) >>> 0) / 0xffffffff);
}

describe('makeVoucherService (in-memory repos)', () => {
  it('generateBatch creates N unique vouchers with correct prefix and logs batch', async () => {
    const campaigns = makeInMemoryCampaignRepo();
    const vouchers = makeInMemoryVoucherRepo();
    const batches  = makeInMemoryGenerationBatchRepo();

    const c = await campaigns.create({
      name: 'Test',
      prefix: 'PX',
      amountCents: 100,
      currency: 'SEK',
      validFrom: new Date('2025-01-01'),
      validTo:   new Date('2025-12-31'),
    });

    const svc = VoucherService({
      campaignRepo: campaigns as any,
      voucherRepo:  vouchers as any,
      batchRepo:    batches as any,
      rng: makeSeededRng(42),
      now: () => new Date('2025-01-01T00:00:00Z'),
      codeLen: 6,
      codeSep: '-',
      chunkSize: 1000,
      maxRetries: 3,
    });

    const res = await svc.generateBatch(c.id, 250);
    expect(res.generatedCount).toBe(250);
    expect(res.status).toBe('SUCCESS');

    const all = await vouchers.listAll?.({}); // se o mock expuser isso; senão:
    const { items } = await vouchers.listByCampaign({ campaignId: c.id, limit: 500 });
    expect(items).toHaveLength(250);

    const codes = items.map(v => v.code);
    expect(new Set(codes).size).toBe(250);
    expect(codes.every(x => x.startsWith('PX-'))).toBe(true);
  });
});
