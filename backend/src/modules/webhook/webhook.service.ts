import { prisma } from '../../lib/prisma'
import { PosWebhookInput } from './webhook.schema'
import { NotFoundError } from '../../utils/errors'

export const webhookService = {

  /**
   * Processes a generic POS stock update:
   *   1. Log the event (always, even on failure)
   *   2. Find the variant by SKU
   *   3. Set the absolute quantity in inventory (optimistic lock)
   *   4. Update log status
   */
  async processPosUpdate(input: PosWebhookInput, rawPayload: unknown) {
    // Always log the incoming event for audit trail
    const log = await prisma.webhookLog.create({
      data: {
        source:  input.source ?? 'POS',
        payload: rawPayload as object,
        status:  'PENDING',
      },
    })

    try {
      // Resolve variant by SKU
      const variant = await prisma.productVariant.findUnique({
        where: { sku: input.sku },
        include: {
          inventory: input.locationId
            ? { where: { locationId: input.locationId } }
            : true,
        },
      })

      if (!variant) {
        throw new NotFoundError(`Variant with SKU "${input.sku}"`)
      }

      const inventoryRows = variant.inventory

      if (inventoryRows.length === 0) {
        // No inventory row for this variant/location — skip gracefully
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: { status: 'SKIPPED', processedAt: new Date() },
        })
        return { status: 'skipped', reason: 'No inventory record for this variant/location' }
      }

      // Update all matching inventory rows with the new quantity
      // Use raw UPDATE with optimistic lock (retry up to 3 times)
      let rowsUpdated = 0
      for (const inv of inventoryRows) {
        const MAX_RETRIES = 3
        for (let i = 1; i <= MAX_RETRIES; i++) {
          const current = await prisma.inventory.findUnique({ where: { id: inv.id } })
          if (!current) break

          const result = await prisma.$executeRaw`
            UPDATE "Inventory"
            SET quantity    = ${input.quantity},
                version     = version + 1,
                "updatedAt" = NOW()
            WHERE id      = ${current.id}
              AND version  = ${current.version}
          `

          if (result === 1) { rowsUpdated++; break }
          if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 20 * i))
        }
      }

      await prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status:      'SUCCESS',
          processedAt: new Date(),
        },
      })

      return { status: 'success', rowsUpdated }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: message },
      })
      throw err  // re-throw so the controller returns 5xx/4xx
    }
  },
}
