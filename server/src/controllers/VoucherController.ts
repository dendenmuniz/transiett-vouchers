import { Request, Response, NextFunction } from "express";
import { csvEscape } from '../utils/csv'
import { CampaignRepo } from '../repositories/CampaignRepo'
import { VoucherRepo } from '../repositories/VoucherRepo'
import { createError} from '../middlewares/ErrorHandler'

const campaignRepo = new CampaignRepo();
const voucherRepo = new VoucherRepo();


export const downloadVouchersCsv = async (  req: Request,
  res: Response,
  next: NextFunction) => {
  try {
    const { campaignId } = req.params

    // 1) ensures the campaign exists (and grabs metadata for fixed columns)
    const campaign = await campaignRepo.findById(campaignId)
    if (!campaign) return next(createError('Campaign not found', 404))

    // 2) headers 
    const ts = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+$/, '') // YYYYMMDDTHHMMSS
    const filename = `vouchers_${campaign.prefix}_${ts}.csv`

    res.status(200)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.write('code,campaignId,prefix,amountCents,currency,createdAt\n')

    // 3) paging (streaming) — avoids loading everything into memory
    const pageSize = 5000
    let cursor: string | undefined = undefined

    while (true) {
      const { items, nextCursor }: { items: any[]; nextCursor?: string } = await voucherRepo.listByCampaign({
        campaignId,
        cursor,
        limit: pageSize,
      })

      if (items.length === 0) break

      for (const v of items) {
        res.write(
          [
            csvEscape(v.code),
            csvEscape(v.campaignId),
            csvEscape(campaign.prefix),
            csvEscape(campaign.amountCents),
            csvEscape(campaign.currency),
            csvEscape(v.createdAt.toISOString()),
          ].join(',') + '\n'
        )
      }

      if (!nextCursor) break
      cursor = nextCursor

      // cede o event loop para não bloquear em lotes grandes
      await new Promise((r) => setImmediate(r))
    }

    res.end()
  } catch (err) {
    next(err)
  }
}

export const downloadAllVouchersCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // headers
    const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '')
    const filename = `vouchers_all_${ts}.csv`
    res.status(200)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.write('code,campaignId,prefix,amountCents,currency,createdAt\n')
    
    const pageSize = 20000
    let cursor: string | undefined

    while (true) {
      const { items, nextCursor } = await voucherRepo.listAll({ cursor, limit: pageSize })
      if (items.length === 0) break

      for (const v of items) {
        res.write(
          [
            csvEscape(v.code),
            csvEscape(v.campaignId),
            csvEscape(v.campaign.prefix),
            csvEscape(v.campaign.amountCents),
            csvEscape(v.campaign.currency),
            csvEscape(v.createdAt.toISOString()),
          ].join(',') + '\n'
        )
      }

      if (!nextCursor) break
      cursor = nextCursor
      await new Promise((r) => setImmediate(r))
    }

    res.end()
  } catch (err) {
    next(err)
  }
}
