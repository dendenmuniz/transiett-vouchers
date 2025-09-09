// src/types.ts
export type Campaign = {
  id: string;
  name?: string;
  prefix: string;
  amountCents: number;
  currency: string;
  validFrom: string;
  validTo: string;
  createdAt?: string;
  voucherCount?: number;
};

export type Voucher = {
  id: string;
  campaignId: string;
  code: string;
  createdAt: string;
};

type CampaignMeta = Pick<Campaign, 'prefix' | 'amountCents' | 'currency' | 'validTo'>;

export type VoucherWithCampaign = {
  id: string;
  campaignId: string;
  code: string;
  createdAt: string;
  campaign: CampaignMeta
 };

export type Paginated<T> = { items: T[]; nextCursor?: string | null, total?: number };
