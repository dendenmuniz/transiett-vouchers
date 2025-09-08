import { CampaignCreateSchema } from '../../src/schemas/CampaignSchema';
import { expectZodFail } from '../helpers/zod';

describe('Campaign Zod Schema', () => {
  it('Check valid payload', () => {
    const payload = {
      name: 'Black Friday 2025',
      prefix: 'BF',
      amountCents: 5000,
      currency: 'SEK',
      validFrom: new Date('2025-11-01T00:00:00Z'),
      validTo: new Date('2025-12-01T00:00:00Z') ,
    };
    const res = CampaignCreateSchema.safeParse(payload);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.prefix).toBe('BF');
      expect(res.data.currency).toBe('SEK');
    }
  });

  it('Rejects payload without required fields', () => {
    const payload = {
      name: 'Black Friday 2025',
      prefix: '',
      amountCents: 5000,
      currency: 'SEK',
      validFrom: new Date('2025-11-01T00:00:00Z'),
      validTo: new Date('2025-12-01T00:00:00Z') ,
    };
    const res = CampaignCreateSchema.safeParse(payload);
    expectZodFail(res, ['prefix']);
    
  });

  it('Rejects very long prefix', () => {
    const payload = { name: 'X', prefix: 'TOO-LONG-PREFIX', amountCents: 100, currency: 'SEK' };
    expect(() => CampaignCreateSchema.parse(payload)).toThrow();
  });

  it('Rejects invalid amountCents', () => {
    const payload = { name: 'X', prefix: 'OK',  currency: 'SEK', validFrom: new Date('2025-01-01T00:00:00Z'),
    validTo:   new Date('2025-12-31T23:59:59Z'), };
    const res = CampaignCreateSchema.safeParse({...payload, amountCents: 0});
    expectZodFail(res, ['amountCents']);
  });

  it('Rejects invalid currency', () => {
    const payload = { name: 'X', prefix: 'OK', amountCents: 100, currency: 'BR' };
    const res = CampaignCreateSchema.safeParse(payload);
     expect(res.success).toBe(false);
  });

  it('Rejects invalid dates or inverted ranges', () => {
    // invalid dates
    expect(() =>
      CampaignCreateSchema.parse({
        prefix: 'OK',
        amountCents: 100,
        currency: 'SEK',
        validFrom: new Date('Invalid'),
        validTo: new Date('Invalid'),
      })
    ).toThrow();

    expect(() =>
      CampaignCreateSchema.parse({
        prefix: 'OK',
        amountCents: 100,
        currency: 'SEK',
        validFrom: new Date('2025-02-01T00:00:00Z'),
        validTo: new Date('2025-01-01T00:00:00Z'),
      })
    ).toThrow();
  });
});
