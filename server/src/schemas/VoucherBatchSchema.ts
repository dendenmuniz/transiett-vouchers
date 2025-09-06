import { z } from 'zod'

export const VoucherBatchSchema = z.object({
  count: z.number().int().min(1).max(100000),
})

export type VoucherBatchDTO = z.infer<typeof VoucherBatchSchema>

export const VoucherBatchResponseSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  requestedCount: z.number().int(),
  generatedCount: z.number().int(),
  durationMs:z.number().int(),
  status: z.string(),
  createdAt: z.date(),
})

export type VoucherBatchResponseDTO = z.infer<typeof VoucherBatchResponseSchema>

export const VoucherBatchListResponseSchema = z.object({
  items: z.array(VoucherBatchResponseSchema),
  nextCursor: z.uuid().optional(),
})

export type VoucherBatchListResponseDTO = z.infer<typeof VoucherBatchListResponseSchema>