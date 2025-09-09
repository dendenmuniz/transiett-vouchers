import { Router } from "express";
import {
  createCampaign,
  createVoucherBatch,
  deleteCampaignById,
  getCampaignById,
  getVoucherById,
  listCampaigns,
  listVoucherBatches,
  listVouchers,
} from "../controllers/CampaignController";

import { downloadVouchersCsv, downloadAllVouchersCsv, listAllVouchers } from '../controllers/VoucherController'

export const router = Router();
router.post("/campaigns", createCampaign);
router.get("/campaigns", listCampaigns);
router.get("/campaigns/:id", getCampaignById);

router.post("/campaigns/:campaignId/vouchers/batch", createVoucherBatch);
router.get("/campaigns/:campaignId/batches", listVoucherBatches);
router.get("/campaigns/:campaignId/vouchers", listVouchers);

router.get('/campaigns/:campaignId/vouchers.csv', downloadVouchersCsv)
router.delete("/campaigns/:id", deleteCampaignById);
router.get('/vouchers/download/all', downloadAllVouchersCsv)
router.get('/vouchers/all', listAllVouchers )
router.get("/vouchers/:id", getVoucherById);
