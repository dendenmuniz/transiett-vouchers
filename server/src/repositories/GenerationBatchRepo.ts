import { PrismaClient, GenerationBatch } from '@prisma/client'

const prisma = new PrismaClient()

export class GenerationBatchRepo {
  /**
   * Creates a new voucher
   */
  async create(data: {
    campaignId: string
    requestedCount: number
    generatedCount: number
    durationMs: number
    status: string
    createdAt: Date
  }): Promise<GenerationBatch> {
    return prisma.generationBatch.create({
      data: {
        campaignId: data.campaignId,
        requestedCount: data.requestedCount,
        generatedCount: data.generatedCount, 
        durationMs: data.durationMs,
        createdAt: data.createdAt,
        status: data.status,
      },
    })
  }

  /**
   * Finds voucher by ID
   */
  async findById(id: string): Promise<GenerationBatch | null> {
    return prisma.generationBatch.findUnique({ where: { id } })
  }

  /**
   * Lists vouchers with basic filters (name/prefix) and pagination
   */
  async list(params: {
    search?: string
    cursor?: string
    limit?: number
  }): Promise<{ items: GenerationBatch[]; nextCursor?: string }> {
    const { search, cursor, limit = 20 } = params

    const items = await prisma.generationBatch.findMany({
      where: search
        ? {
            OR: [
              { campaignId: { contains: search, mode: 'insensitive' } },
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
    await prisma.generationBatch.delete({ where: { id } })
  }
}
