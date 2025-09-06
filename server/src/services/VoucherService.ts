import { CampaignRepo } from '../repositories/CampaignRepo'
import { VoucherRepo } from '../repositories/VoucherRepo'
import { GenerationBatchRepo } from '../repositories/GenerationBatchRepo'

type Deps = {
  campaignRepo: CampaignRepo
  voucherRepo: VoucherRepo
  batchRepo: GenerationBatchRepo
}

export class VoucherService {
  private campaignRepo: CampaignRepo
  private voucherRepo: VoucherRepo
  private batchRepo: GenerationBatchRepo

  // tunable parameters
  private readonly chunkSize = 1000       // batch limit
  private readonly maxRetries = 5         // re-try in case of duplicates
  private readonly codeLen = 6            // sufix length

  constructor(deps: Deps) {
    this.campaignRepo = deps.campaignRepo
    this.voucherRepo = deps.voucherRepo
    this.batchRepo = deps.batchRepo
  }

  /**
   * Generate vouchers `count` vouchers for campaign, in batchs
   * Return data of created batch
   */
  async generateBatch(campaignId: string, count: number) {
    const campaign = await this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const startedAt = Date.now()
    const started = await this.batchRepo.create({
      campaignId: campaignId,
      requestedCount: count,
      generatedCount: 0,
      durationMs: 0,
      status: 'STARTED',
      createdAt: new Date(),
    }) // return { id, ... }

    let generated = 0
    const now = new Date()

    // Loop: generate and insert until batch limit
    while (generated < count) {
      const remaining = count - generated
      const target = Math.min(this.chunkSize, remaining)

      // generate unique codes (in-memory)
      const codes = this.generateCodes(target, campaign.prefix)

      // try insert batch, retry in case of duplicate codes
      const inserted = await this.insertWithRetries(campaignId, codes, now)

      generated += inserted

      // if problem, break to avoid infinite loop
      if (inserted === 0) break
    }

    const durationMs = Date.now() - startedAt
    const status = generated === count ? 'SUCCESS' : 'PARTIAL'

    const finished = await this.batchRepo.logFinish({
      batchId: started.id,
      generatedCount: generated,
      durationMs,
      status,
    })

    return finished 
  }

  // ----------------- helpers -----------------

  /**
   * generate N unique codes in each batch `PREFIX-XXXXXX` (A–Z) .
   */
  private generateCodes(n: number, prefix: string): string[] {
    const set = new Set<string>()
    while (set.size < n) {
      set.add(`${prefix}-${this.randLetters(this.codeLen)}`)
    }
    return Array.from(set)
  }

  private randLetters(len: number) {
    const A = 65
    let s = ''
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(A + Math.floor(Math.random() * 26))
    }
    return s
  }

  /**
   * Insert batch with retry.  `skipDuplicates` at createMany,
   * if insert < generated (duplicates), generate new codes
   */
  private async insertWithRetries(campaignId: string, codes: string[], createdAt: Date) {
    let attempts = 0
    let insertedTotal = 0
    let pending = codes

    while (pending.length > 0 && attempts <= this.maxRetries) {
      attempts++

      // create register
      const rows = pending.map(code => ({ campaignId, code, createdAt }))

      // createMany with skipDuplicates 
      const res = await this.voucherRepo.bulkInsert(rows) // return { count: number }

      // Ensure res has a count property
      if ('count' in res && typeof res.count === 'number') {
        insertedTotal += res.count
      } else {
        throw new Error('bulkInsert did not return a result with count property')
      }

      // if duplicates, `count < pending.length`
      const missing = pending.length - res.count
      if (missing <= 0) break

      // re-generate only missin
      const newCodes = this.generateCodes(missing, rows[0].code.split('-')[0])
      pending = newCodes
    }

    return insertedTotal
  }
}
