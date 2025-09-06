import { z } from 'zod'

export const VoucherResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  campaignId: z.uuid(),
  createdAt: z.date(),

})

export type VoucherResponseDTO = z.infer<typeof VoucherResponseSchema>

export const VoucherListResponseSchema = z.object({
  items: z.array(VoucherResponseSchema),
  nextCursor: z.uuid().optional(),
})

export type VoucherListResponseDTO = z.infer<typeof VoucherListResponseSchema>