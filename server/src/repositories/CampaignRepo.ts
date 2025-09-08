import type { PrismaClient, Campaign } from '@prisma/client';

export type CampaignRepo = {
  create(data: {
    name?: string;
    prefix: string;
    amountCents: number;
    currency: string;
    validFrom: Date;
    validTo: Date;
  }): Promise<Campaign>;

  findById(id: string): Promise<Campaign | null>;

  list(params: {
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Campaign[]; nextCursor?: string }>;

  deleteById(id: string): Promise<void>;
};

export const CampaignRepo = (prisma: PrismaClient): CampaignRepo => ({

  /**
   * Creates a new campaign
   */
  async create(data) {
    return prisma.campaign.create({data});
  },

  /**
   * Finds campaign by ID
   */
  async findById(id) {
    return prisma.campaign.findUnique({ where: { id } });
  },

  /**
   * Lists campaigns with basic filters (name/prefix) and pagination
   */
  async list({search, cursor, limit = 20}): Promise<{ items: Campaign[]; nextCursor?: string }> {
    
    const items = await prisma.campaign.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { prefix: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = nextItem.id;
    }

    return { items, nextCursor };
  },

  /**
   * Deletes a campaign (vouchers are removed via cascade)
   */
  async deleteById(id) {
    await prisma.campaign.delete({ where: { id } });
  }
})
