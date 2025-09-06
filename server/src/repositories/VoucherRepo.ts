import { Voucher } from "@prisma/client";
import { prisma } from "../prisma";

export class VoucherRepo {
  /**
   * Creates a new voucher
   */
  async bulkInsert(
    records: { campaignId: string; code: string; createdAt: Date }[]
  ) {
    if (records.length === 0) return [];

    return prisma.voucher.createMany({
      data: records,
      skipDuplicates: true, // dismiss duplicates
    });
  }

  /**
   * Finds voucher by ID
   */
  async findById(id: string): Promise<Voucher | null> {
    return prisma.voucher.findUnique({ where: { id } });
  }

  /**
   * Lists vouchers with basic filters (name/prefix) and pagination
   */
  async listByCampaign(params: {
    campaignId?: string;
    cursor?: string;
    limit?: number;
    search?: string;
  }): Promise<{ items: Voucher[]; nextCursor?: string }> {
    const { campaignId, search, cursor, limit = 20 } = params;

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
  }

  /**
   * Deletes a voucher (vouchers are removed via cascade)
   */
  async delete(id: string): Promise<void> {
    await prisma.voucher.delete({ where: { id } });
  }

  /**
   * List all vouchers
   */
  async listAll(params: {
    cursor?: string;
    limit?: number;
    search?: string; // opcional: por code ou prefix da campanha
  }): Promise<{
    items: (Voucher & {
      campaign: { prefix: string; amountCents: number; currency: string };
    })[];
    nextCursor?: string;
  }> {
    const { cursor, limit = 1000, search } = params;

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
}
