import { PrismaClient, Voucher } from "@prisma/client";
export type VoucherRepo = {
  bulkInsert(records: { campaignId: string; code: string; createdAt: Date }[]): Promise<{ count: number }>;

  findById(id: string): Promise<Voucher | null>;

  listByCampaign(params: {
    campaignId?: string;
    cursor?: string;
    limit?: number;
    search?: string;
  }): Promise<{ items: Voucher[]; nextCursor?: string }>;

  delete(id: string): Promise<void>;

  listAll(params: {
    cursor?: string;
    limit?: number;
    search?: string;
  }): Promise<{
    items: (Voucher & {
      campaign: { prefix: string; amountCents: number; currency: string };
    })[];
    nextCursor?: string;
  }>;
};

export const VoucherRepo = (prisma: PrismaClient): VoucherRepo => ({
  /**
   * Creates a new voucher
   */
   async bulkInsert(records) {
    if (!records.length) return { count: 0 };
    return prisma.voucher.createMany({
      data: records,
      skipDuplicates: true,
    });
  },

  /**
   * Finds voucher by ID
   */
  async findById(id) {
    return prisma.voucher.findUnique({ where: { id } });
  },

  /**
   * Lists vouchers with basic filters (name/prefix) and pagination
   */
  async listByCampaign({campaignId, cursor, limit = 20 , search }) {
  
    const items = await prisma.voucher.findMany({
      where: {
        campaignId,
        ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
      },
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
    await prisma.voucher.delete({ where: { id } });
  },

  /**
   * List all vouchers
   */
  async listAll({cursor, limit = 20, search}){
    
    const items = await prisma.voucher.findMany({
      where: search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              {
                campaign: { prefix: { contains: search, mode: "insensitive" } },
              },
            ],
          }
        : undefined,
      include: {
        campaign: {
          select: { prefix: true, amountCents: true, currency: true },
        },
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | undefined;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = nextItem.id;
    }
    return { items, nextCursor };
  }
})
