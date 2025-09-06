import { Campaign } from "@prisma/client";

import { prisma } from "../prisma";

export class CampaignRepo {
  /**
   * Creates a new campaign
   */
  async create(data: {
    name?: string;
    prefix: string;
    amountCents: number;
    currency: string;
    validFrom: Date;
    validTo: Date;
  }): Promise<Campaign> {
    return prisma.campaign.create({
      data: {
        name: data.name,
        prefix: data.prefix,
        amountCents: data.amountCents,
        currency: data.currency,
        validFrom: data.validFrom,
        validTo: data.validTo,
      },
    });
  }

  /**
   * Finds campaign by ID
   */
  async findById(id: string): Promise<Campaign | null> {
    return prisma.campaign.findUnique({ where: { id } });
  }

  /**
   * Lists campaigns with basic filters (name/prefix) and pagination
   */
  async list(params: {
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Campaign[]; nextCursor?: string }> {
    const { search, cursor, limit = 20 } = params;

    const items = await prisma.campaign.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { prefix: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      // fetch one extra to check if there is a next page
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
   * Deletes a campaign (vouchers are removed via cascade)
   */
  async delete(id: string): Promise<void> {
    await prisma.campaign.delete({ where: { id } });
  }
}
