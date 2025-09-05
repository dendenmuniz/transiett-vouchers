import { PrismaClient, Voucher } from '@prisma/client'

const prisma = new PrismaClient()

export class VoucherRepo {
  /**
   * Creates a new voucher
   */
  async create(data: {
    campaignId: string
    createdAt: Date
    code: string
  }): Promise<Voucher> {
    return prisma.voucher.create({
      data: {
        campaignId: data.campaignId,
        createdAt: data.createdAt,
        code: data.code, 
      },
    })
  }

  /**
   * Finds voucher by ID
   */
  async findById(id: string): Promise<Voucher | null> {
    return prisma.voucher.findUnique({ where: { id } })
  }

  /**
   * Lists vouchers with basic filters (name/prefix) and pagination
   */
  async list(params: {
    search?: string
    cursor?: string
    limit?: number
  }): Promise<{ items: Voucher[]; nextCursor?: string }> {
    const { search, cursor, limit = 20 } = params

    const items = await prisma.voucher.findMany({
      where: search
        ? {
            OR: [
              { campaignId: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      // fetch one extra to check if there is a next page
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    let nextCursor: string | undefined = undefined
    if (items.length > limit) {
      const nextItem = items.pop()!
      nextCursor = nextItem.id
    }

    return { items, nextCursor }
  }

  /**
   * Deletes a voucher (vouchers are removed via cascade)
   */
  async delete(id: string): Promise<void> {
    await prisma.voucher.delete({ where: { id } })
  }
}
