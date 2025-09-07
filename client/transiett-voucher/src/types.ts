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

export type Paginated<T> = { items: T[]; nextCursor?: string | null };
