import { randomUUID } from 'crypto';
import type { GenerationBatch } from '@prisma/client';
import type { GenerationBatchRepo as GenerationBatchRepoApi } from '../../src/repositories/GenerationBatchRepo';


export function makeInMemoryGenerationBatchRepo() : GenerationBatchRepoApi & {
  _state: { batches: Map<string, GenerationBatch> };
  _deleteByCampaign(campaignId: string): void;
} {
  const batches = new Map<string, GenerationBatch>();

  function stableSort(a: GenerationBatch, b: GenerationBatch) {
    const t = b.createdAt.getTime() - a.createdAt.getTime();
    if (t !== 0) return t;
    return b.id.localeCompare(a.id);
  }

  return {
    async create(data) {
      const b: GenerationBatch = {
        id: randomUUID(),
        campaignId: data.campaignId,
        requestedCount: data.requestedCount,
        generatedCount: data.generatedCount,
        durationMs: data.durationMs,
        status: data.status,
        createdAt: data.createdAt,
      };
      batches.set(b.id, b);
      return b;
    },

    async logFinish({ batchId, generatedCount, durationMs, status }) {
      const current = batches.get(batchId);
      if (!current) throw new Error('Batch not found');
      const updated: GenerationBatch = {
        ...current,
        generatedCount,
        durationMs,
        status,
      };
      batches.set(batchId, updated);
      return updated;
    },

    async findById(id) {
      return batches.get(id) ?? null;
    },

    async listByCampaign({ campaignId, cursor, limit = 20 }) {
      let items = [...batches.values()].filter(b =>
        campaignId ? b.campaignId === campaignId : true
      );

      items.sort(stableSort);

      if (cursor) {
        const idx = items.findIndex(i => i.id === cursor);
        if (idx >= 0) items = items.slice(idx + 1);
      }

      const page = items.slice(0, limit + 1);
      let nextCursor: string | undefined;
      if (page.length > limit) {
        page.pop();
        nextCursor = page[page.length - 1]?.id;
      }

      return { items: page, nextCursor };
    },

    async delete(id) {
      batches.delete(id);
    },

    _state: { batches },

    _deleteByCampaign(campaignId: string) {
      for (const [id, b] of batches.entries()) {
        if (b.campaignId === campaignId) batches.delete(id);
      }
    },
  };
}
