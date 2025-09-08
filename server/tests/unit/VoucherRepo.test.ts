import { makeInMemoryVoucherRepo } from './VoucherRepo.mock';

describe('VoucherRepo (in-memory)', () => {
  it('bulkInsert respects skipDuplicates by code', async () => {
    const repo = makeInMemoryVoucherRepo();

    const r1 = await repo.bulkInsert([
      { campaignId: 'C1', code: 'AA-111', createdAt: new Date() },
      { campaignId: 'C1', code: 'AA-222', createdAt: new Date() },
      { campaignId: 'C1', code: 'AA-111', createdAt: new Date() }, // dup
    ]);
    expect(r1.count).toBe(2);

    const r2 = await repo.bulkInsert([
      { campaignId: 'C1', code: 'AA-222', createdAt: new Date() }, // dup again
      { campaignId: 'C1', code: 'AA-333', createdAt: new Date() },
    ]);
    expect(r2.count).toBe(1);
  });

  it('listByCampaign filters by campaign, supports search and cursor pagination', async () => {
    const repo = makeInMemoryVoucherRepo();

    // seed
    await repo.bulkInsert([
      { campaignId: 'C1', code: 'PX-001', createdAt: new Date('2025-01-01') },
      { campaignId: 'C1', code: 'PX-ABC', createdAt: new Date('2025-01-02') },
      { campaignId: 'C1', code: 'PX-XYZ', createdAt: new Date('2025-01-03') },
      { campaignId: 'C2', code: 'OT-999', createdAt: new Date('2025-01-04') },
    ]);

    // filtro por campanha
    const page1 = await repo.listByCampaign({ campaignId: 'C1', limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).toBeDefined();

    const page2 = await repo.listByCampaign({ campaignId: 'C1', limit: 2, cursor: page1.nextCursor });
    expect(page2.items).toHaveLength(1);

    const allIds = [...page1.items, ...page2.items].map(v => v.id);
    expect(new Set(allIds).size).toBe(3); // sem duplicar

    // search
    const search = await repo.listByCampaign({ campaignId: 'C1', search: 'ab' });
    expect(search.items.map(v => v.code)).toEqual(expect.arrayContaining(['PX-ABC']));
  });

  it('findById and delete', async () => {
    const repo = makeInMemoryVoucherRepo();
    const { count } = await repo.bulkInsert([
      { campaignId: 'C3', code: 'K1', createdAt: new Date() },
    ]);
    expect(count).toBe(1);

    const { items } = await repo.listByCampaign({ campaignId: 'C3' });
    const v = await repo.findById(items[0].id);
    expect(v?.code).toBe('K1');

    await repo.delete(items[0].id);
    const after = await repo.findById(items[0].id);
    expect(after).toBeNull();
  });
});
