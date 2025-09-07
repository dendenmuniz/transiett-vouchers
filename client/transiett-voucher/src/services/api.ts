import axios from "axios";
import type { Campaign, Paginated, Voucher } from "../types";

type BatchResult = {
  requestedCount: number;
  generatedCount: number;
  durationMs: number;
};

type CampaignListResponse = { items: Campaign[] };


const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message =
      data?.message ??
      error?.message ??
      `HTTP ${status ?? "error"}`;

  
    const issues = data?.details?.issues as Array<{ path?: string; message?: string }> | undefined;
    let pretty: string | undefined;
    if (issues?.length) {
      pretty = issues
        .map(i => `${i.path ?? ""}${i.path ? ": " : ""}${i.message ?? ""}`.trim())
        .join("\n");
    }

    return Promise.reject({
      name: "ApiError",
      message: pretty ?? message,
      status,
      details: data?.details ?? data,
    });
  }
);

export const apiService = {
  // Campaigns
  async listCampaigns(): Promise<Campaign[]> {
    const res = await api.get<CampaignListResponse>("/campaigns");
    return res.data.items ?? [];
  },

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    const res = await api.post<Campaign>("/campaigns", data);
    return res.data;
  },

  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  async getCampaign(id: string): Promise<Campaign> {
    const res = await api.get<Campaign>(`/campaigns/${id}`);
    return res.data;
  },

  // Vouchers
  async genVoucherBatch(id: string, count: number): Promise<BatchResult> {
    const res = await api.post<BatchResult>(`/campaigns/${id}/vouchers/batch`, { count });
    return res.data;
  },

  async listVouchers(id: string, limit = 50, cursor?: string): Promise<Paginated<Voucher>> {
    const res = await api.get<Paginated<Voucher>>(`/campaigns/${id}/vouchers`, {
      params: { limit, cursor },
    });
    return res.data;
  },

  // CSV
  csvUrl(id: string): string {
    return `/api/campaigns/${id}/vouchers.csv`;
  },
};
