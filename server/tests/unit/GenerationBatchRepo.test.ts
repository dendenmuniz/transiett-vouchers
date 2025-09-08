import { makeInMemoryGenerationBatchRepo } from './GenerationBatchRepo.mock';

describe('GenerationBatchRepo (in-memory)', () => {
  it('create, logFinish, findById', async () => {
    const repo = makeInMemoryGenerationBatchRepo();
    const b = await repo.create({
      campaignId: 'C1',
      requestedCount: 100,
      generatedCount: 0,
      durationMs: 0,
      status: 'STARTED',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const updated = await repo.logFinish({
      batchId: b.id,
      generatedCount: 100,
      durationMs: 250,
      status: 'SUCCESS',
    });

    expect(updated.generatedCount).toBe(100);
    expect(updated.status).toBe('SUCCESS');

    const found = await repo.findById(b.id);
    expect(found?.durationMs).toBe(250);
  });

  it('listByCampaign with cursor and delete', async () => {
    const repo = makeInMemoryGenerationBatchRepo();

    const b1 = await repo.create({
      campaignId: 'C2', requestedCount: 10, generatedCount: 10,
      durationMs: 10, status: 'SUCCESS',
      createdAt: new Date('2025-01-01'),
    });
    const b2 = await repo.create({
      campaignId: 'C2', requestedCount: 20, generatedCount: 20,
      durationMs: 20, status: 'SUCCESS',
      createdAt: new Date('2025-01-02'),
    });

    const p1 = await repo.listByCampaign({ campaignId: 'C2', limit: 1 });
    expect(p1.items).toHaveLength(1);
    expect(p1.nextCursor).toBeDefined();
    
    const p2 = await repo.listByCampaign({ campaignId: 'C2', limit: 1, cursor: p1.nextCursor });
    expect(p2.items).toHaveLength(1);

    const ids = [...p1.items, ...p2.items].map(b => b.id);
    expect(new Set(ids).size).toBe(2);

    await repo.delete(b1.id);
    const after = await repo.findById(b1.id);
    expect(after).toBeNull();
  });
});
