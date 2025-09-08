import { CampaignRepo } from '../repositories/CampaignRepo'
import { VoucherRepo } from '../repositories/VoucherRepo'
import { GenerationBatchRepo } from '../repositories/GenerationBatchRepo'

type GenerateBatchResult = Awaited<ReturnType<GenerationBatchRepo['logFinish']>>;

type VoucherServiceDeps = {
  campaignRepo: CampaignRepo;
  voucherRepo: VoucherRepo;
  batchRepo: GenerationBatchRepo;
  rng?: () => number;       // default: Math.random
  now?: () => Date;         // default: () => new Date()
  chunkSize?: number;       // default: 1000
  maxRetries?: number;      // default: 5
  codeLen?: number;         // default: 6
  codeSep?: string;         // default: '-'
}

export const VoucherService = (deps: VoucherServiceDeps) => {
  const rng = deps.rng ?? Math.random;
  const nowFn = deps.now ?? (() => new Date());
  const chunkSize = deps.chunkSize ?? 1000;
  const maxRetries = deps.maxRetries ?? 5;
  const codeLen = deps.codeLen ?? 6;
  const codeSep = deps.codeSep ?? '-';

  /**
   * Generate vouchers `count` vouchers for campaign, in batchs
   * Return data of created batch
   */
  async function generateBatch(campaignId: string, count: number): Promise<GenerateBatchResult> {
    const campaign = await deps.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const startedAt = Date.now();
    const started = await deps.batchRepo.create({
      campaignId: campaignId,
      requestedCount: count,
      generatedCount: 0,
      durationMs: 0,
      status: 'STARTED',
      createdAt: new Date(),
    }); // return { id, ... }

    let generated = 0;
    const createdAt = new Date();

    // Loop: generate and insert until batch limit
    while (generated < count) {
      const remaining = count - generated
      const target = Math.min(chunkSize, remaining)

      // generate unique codes (in-memory)
      const codes = generateCodes(rng, codeLen, codeSep, target, campaign.prefix)

      // try insert batch, retry in case of duplicate codes
      const inserted = await insertWithRetries({
        voucherRepo: deps.voucherRepo,
        campaignId,
        prefix: campaign.prefix,
        initialCodes: codes,
        createdAt,
        rng,
        codeLen,
        codeSep,
        maxRetries,
      });

      generated += inserted
      // if problem, break to avoid infinite loop
      if (inserted === 0) break
    }

    const durationMs = Date.now() - startedAt
    const status = generated === count ? 'SUCCESS' : 'PARTIAL'

    const finished = await deps.batchRepo.logFinish({
      batchId: started.id,
      generatedCount: generated,
      durationMs,
      status,
    })

    return finished
  }

  return { generateBatch }
};

// ----------------- helpers -----------------

/**
 * generate N unique codes in each batch `PREFIX-XXXXXX` (A–Z) .
 */

const randLetters = (rng: () => number, len: number): string => {
  const A = 65;
  let s = '';
  for (let i = 0; i < len; i++) {
    s += String.fromCharCode(A + Math.floor(rng() * 26));
  }
  return s;
}

const generateCodes = (rng: () => number,
  codeLen: number,
  sep: string,
  n: number,
  prefix: string,): string[] => {
  const set = new Set<string>()
  while (set.size < n) {
    set.add(`${prefix}${sep}${randLetters(rng, codeLen)}`)
  }
  return Array.from(set)
}



/**
 * Insert batch with retry.  `skipDuplicates` at createMany,
 * if insert < generated (duplicates), generate new codes
 */
const insertWithRetries = async (args: {
  voucherRepo: VoucherRepo;
  campaignId: string;
  prefix: string;
  initialCodes: string[];
  createdAt: Date;
  rng: () => number;
  codeLen: number;
  codeSep: string;
  maxRetries: number;
}): Promise<number> => {
  const {
    voucherRepo, campaignId, prefix,
    initialCodes, createdAt, rng, codeLen, codeSep, maxRetries,
  } = args;

  let attempts = 0;
  let insertedTotal = 0;
  let pending = initialCodes;

  while (pending.length > 0 && attempts <= maxRetries) {
    attempts++;

    const rows = pending.map(code => ({ campaignId, code, createdAt }));
    const res = await voucherRepo.bulkInsert(rows); // { count: number }

    if (!('count' in res) || typeof res.count !== 'number') {
      throw new Error('bulkInsert did not return a result with count property');
    }

    insertedTotal += res.count;

    const missing = pending.length - res.count;
    if (missing <= 0) break;

    // re-gerar apenas o que faltou (prováveis colisões)
    pending = generateCodes(rng, codeLen, codeSep, missing, prefix);
  }

  return insertedTotal;
}
