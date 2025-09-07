import { z } from 'zod'

export const CampaignCreateSchema = z.object({
  name: z.string().max(255),
  prefix: z.string().regex(/^[A-Z]+$/, 'Prefix must be uppercase letters only'),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).regex(/^[A-Z]+$/, 'Currency must be uppercase 3 letters'),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
}).refine((data) => data.validFrom <= data.validTo, {
  message: 'validFrom must be before or equal to validTo',
  path: ['validTo'],
})

export type CampaignCreateDTO = z.infer<typeof CampaignCreateSchema>


export const CampaignResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  prefix: z.string(),
  amountCents: z.number().int(),
  currency: z.string().length(3),
  validFrom: z.date(),
  validTo: z.date(),  
})

export type CampaignResponseDTO = z.infer<typeof CampaignResponseSchema>

export const CampaignWithCountSchema = CampaignResponseSchema.extend({
  voucherCount: z.number().int().nonnegative().optional(),
});


export const CampaignListResponseSchema = z.object({
  items: z.array(CampaignWithCountSchema),
  nextCursor: z.uuid().optional(),
})

export type CampaignListResponseDTO = z.infer<typeof CampaignListResponseSchema>

