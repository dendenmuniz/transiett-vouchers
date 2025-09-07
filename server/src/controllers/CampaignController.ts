import { Request, Response, NextFunction } from "express";
import { ZodError  } from "zod";
import { createError } from "../middlewares/ErrorHandler";

import { CampaignRepo } from "../repositories/CampaignRepo";
import { VoucherRepo } from "../repositories/VoucherRepo";
import { GenerationBatchRepo } from "../repositories/GenerationBatchRepo";
import {
  CampaignCreateSchema,
  CampaignResponseSchema,
  CampaignListResponseSchema,
  CampaignWithCountSchema,
} from "../schemas/CampaignSchema";
import {
  VoucherBatchSchema,
  VoucherBatchResponseSchema,
  VoucherBatchListResponseSchema,
} from "../schemas/VoucherBatchSchema";
import { VoucherListResponseSchema, VoucherResponseSchema } from "../schemas/VoucherResponseSchema";
import { VoucherService } from '../services/VoucherService'



const campaignRepo = new CampaignRepo();
const voucherRepo = new VoucherRepo();
const generationBatchRepo = new GenerationBatchRepo();

const voucherService = new VoucherService({
  campaignRepo,
  voucherRepo,
  batchRepo: generationBatchRepo,
})


// Create Campaign
export const createCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = CampaignCreateSchema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    const campaign = await campaignRepo.create(parsed.data);
    const response = CampaignResponseSchema.parse(campaign);
    res.status(201).json(response);
  } catch (err) {
    next(err)
  }
};

// Get Campaign by ID
export const getCampaignById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const campaign = await campaignRepo.findById(id);
    if (!campaign) {
      return next(createError("Campaign not found", 404));
    }
      const { items: batches } = await generationBatchRepo.listByCampaign({
      campaignId: id,
      limit: 1,
    });
    const voucherCount = batches[0]?.generatedCount ?? 0;
    const response = CampaignWithCountSchema.parse({
      ...campaign,
      voucherCount,
    });
    res.json(response);
  } catch (err) {
    if (err instanceof ZodError) return next(createError('Validation error', 400, err))
    next(err)
  }
};

// List Campaigns with pagination and search
export const listCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const search = req.query.search as string | undefined;

    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    if (limit !== undefined && (isNaN(limit) || limit <= 0 || limit > 100)) {
      return next(
        createError("Limit must be a positive number up to 100", 400)
      );
    }
    const { items, nextCursor } = await campaignRepo.list({
      search,
      cursor,
      limit,
    });
    const itemsWithCounts = await Promise.all(
      items.map(async (c) => {
        const { items: batches } = await generationBatchRepo.listByCampaign({
          campaignId: c.id,
          limit: 1, // pega o mais recente
        });
        const voucherCount = batches[0]?.generatedCount ?? 0;
        return { ...c, voucherCount };
      })
    );

    // Agora valida já com o campo extra
    const response = CampaignListResponseSchema.parse({
      items: itemsWithCounts,
      nextCursor,
    });
    res.json(response);
  } catch (err) {
    if (err instanceof ZodError) return next(createError('Validation error', 400, err))
    next(err)
  }
};


// Create voucher batch
export const createVoucherBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { campaignId } = req.params;
    const parsed = VoucherBatchSchema.safeParse({ ...req.body, campaignId: req.params.id })
    if (!parsed.success || typeof parsed.data?.count !== 'number') {
      return  next(parsed.error);
    }
    const batch = await voucherService.generateBatch(campaignId, parsed.data.count)
    const out = VoucherBatchResponseSchema.parse(batch)
    res.status(201).json(out)
  } catch (err) {
    next(err)
  }
}

// List voucher batches with pagination and search
export const listVoucherBatches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { campaignId } = req.params;
    const cursor = (req.query.cursor as string) || undefined
    const limit = req.query.limit ? Number(req.query.limit) : 20
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1000) {
      return next(createError('Limit must be 1..1000', 400))
    }

    // use um método específico por campanha
    const { items, nextCursor } = await generationBatchRepo.listByCampaign({ campaignId, cursor, limit })
    const out = VoucherBatchListResponseSchema.parse({ items, nextCursor })
    res.json(out)
  } catch (err) {
    if (err instanceof ZodError) return next(createError('Validation error', 400, err))
    next(err)
  }
}

// List vouchers with pagination and search
export const listVouchers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { campaignId } = req.params;
const cursor = (req.query.cursor as string) || undefined
    const limit = req.query.limit ? Number(req.query.limit) : 50
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1000) {
      return next(createError('Limit must be 1..1000', 400))
    }

    const { items, nextCursor } = await voucherRepo.listByCampaign({ campaignId, cursor, limit })
    const out = VoucherListResponseSchema.parse({ items, nextCursor })
    res.json(out)
  } catch (err) {
    if (err instanceof ZodError) return next(createError('Validation error', 400, err))
    next(err)
  }
}

// Get voucher by ID
export const getVoucherById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const voucher = await voucherRepo.findById(id);
    if (!voucher) return next(createError('Voucher not found', 404))
    const out = VoucherResponseSchema.parse(voucher)        
    res.json(out)
  } catch (error) {
    next(createError("Invalid request", 400, error));
  }
};



export const deleteCampaignById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await campaignRepo.deleteById(id); 
    const ok = campaignRepo.findById(id);
    if (!ok) return next(createError("Campaign not found", 404));
    return res.status(204).end(); 
  } catch (err) {
    next(err);
  }
}


