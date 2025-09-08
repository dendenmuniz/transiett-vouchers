import { makeInMemoryCampaignRepo } from './CampaignRepo.mock';

describe('CampaignRepo (in-memory)', () => {
  it('Create and list campaigns', async () => {
    const repo = makeInMemoryCampaignRepo();
    await repo.create({ name: 'A', prefix: 'AAA', amountCents: 100, currency: 'SEK',validFrom: new Date('2025-11-01T00:00:00Z'),
      validTo: new Date('2025-12-01T00:00:00Z') , });
    await repo.create({ name: 'B', prefix: 'BBB', amountCents: 200, currency: 'SEK',validFrom: new Date('2025-11-01T00:00:00Z'),
      validTo: new Date('2025-12-01T00:00:00Z') , });

    
    const {items} = await repo.list({});
    expect(items).toHaveLength(2);
    expect(items.map(c => c.name ?? '')).toEqual(expect.arrayContaining(['A', 'B']));
    
    const resA = await repo.list({search: 'A'});
    expect(resA.items.map(c => c.name ?? '')).toEqual(expect.arrayContaining(['A'])); 

  });

  it('deleteCascade removes campaign', async () => {
    const repo = makeInMemoryCampaignRepo();
    const c = await repo.create({ name: 'X', prefix: 'X', amountCents: 300, currency: 'SEK',validFrom: new Date('2025-11-01T00:00:00Z'),
      validTo: new Date('2025-12-01T00:00:00Z') , });
    const ok = await repo.deleteById (c.id);
    
    const all = await repo.findById(c.id)
    expect(all).toBeNull();
  });
});
