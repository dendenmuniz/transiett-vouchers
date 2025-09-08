import { PrismaClient, GenerationBatch } from "@prisma/client";

export type GenerationBatchRepo = {
  create(data: {
    campaignId: string;
    requestedCount: number;
    generatedCount: number;
    durationMs: number;
    status: string;
    createdAt: Date;
  }): Promise<GenerationBatch>;

  logFinish(data: {
    batchId: string;
    generatedCount: number;
    durationMs: number;
    status: string;
  }): Promise<GenerationBatch>;

  findById(id: string): Promise<GenerationBatch | null>;

  listByCampaign(params: {
    campaignId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: GenerationBatch[]; nextCursor?: string }>;

  delete(id: string): Promise<void>;
};

export const GenerationBatchRepo = (prisma: PrismaClient): GenerationBatchRepo => ({
  /**
   * Creates a new voucher
   */
  async create(data): Promise<GenerationBatch> {
    return prisma.generationBatch.create({
      data,
    });
  },

  async logFinish({batchId, generatedCount, durationMs, status}){
    return prisma.generationBatch.update({
      where: { id: batchId },
      data: {
        generatedCount: generatedCount,
        durationMs: durationMs,
        status: status,
      },
    });
  },

  /**
   * Finds voucher by ID
   */
  async findById(id) {
    return prisma.generationBatch.findUnique({ where: { id } });
  },

  /**
   * Lists vouchers with basic filters (name/prefix) and pagination
   */
  async listByCampaign({campaignId, cursor,  limit = 20 }) {
        const items = await prisma.generationBatch.findMany({
      where: {campaignId},
      // fetch one extra to check if there is a next page
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = nextItem.id;
    }

    return { items, nextCursor };
  },

  /**
   * Deletes a voucher (vouchers are removed via cascade)
   */
  async delete(id) {
    await prisma.generationBatch.delete({ where: { id } });
  }
})
