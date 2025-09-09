import { z } from 'zod'

export const CampaignMetaSchema = z.object({
  prefix: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  validTo: z.date()
});

export const VoucherResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  campaignId: z.uuid(),
  createdAt: z.date(),
  campaign: CampaignMetaSchema,
})

export const VoucherListSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  campaignId: z.uuid(),
  createdAt: z.date(),
})

export const VouchersByCampaignSchema = z.object({
  items: z.array(VoucherListSchema),
  nextCursor:  z.uuid().optional(),
})

export type VoucherResponseDTO = z.infer<typeof VoucherResponseSchema>

export type VoucherListsResponseDTO = z.infer<typeof VouchersByCampaignSchema>

export const VoucherListResponseSchema = z.object({
  items: z.array(VoucherResponseSchema),
  nextCursor: z.uuid().optional(),
  total: z.number().int().nonnegative().optional(),
})

export type VoucherListResponseDTO = z.infer<typeof VoucherListResponseSchema>

