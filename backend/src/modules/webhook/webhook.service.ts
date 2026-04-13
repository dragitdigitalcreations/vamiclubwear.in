import { prisma } from '../../lib/prisma'
import { PosWebhookInput, DelhiveryWebhookInput } from './webhook.schema'
import { mapDelhiveryStatus } from '../shipping/delhivery.service'
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

  /**
   * Processes a Delhivery SCANPUSH event:
   *   1. Log the raw payload (always)
   *   2. Look up the Order by AWB number
   *   3. Map Delhivery status string → our ShippingStatus enum
   *   4. Update Order.shippingStatus if the mapped value is non-null
   *   5. Update log status
   */
  async processDelhiveryWebhook(input: DelhiveryWebhookInput, rawPayload: unknown) {
    const log = await prisma.webhookLog.create({
      data: {
        source:  'DELHIVERY',
        payload: rawPayload as object,
        status:  'PENDING',
      },
    })

    try {
      const AWB    = input.Shipment.AWB
      const Status = input.Shipment.Status.Status

      // Find order by AWB
      const order = await prisma.order.findFirst({
        where: { awbNumber: AWB },
        select: { id: true, shippingStatus: true },
      })

      if (!order) {
        // Delhivery can push for shipments we created before the order was matched.
        // Log as SKIPPED — don't fail so Delhivery doesn't retry indefinitely.
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: { status: 'SKIPPED', processedAt: new Date() },
        })
        return { status: 'skipped', reason: `No order found for AWB ${AWB}` }
      }

      const mappedStatus = mapDelhiveryStatus(Status)

      if (!mappedStatus) {
        // Status we don't act on (e.g. "Pickup Scheduled") — log and skip
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: { status: 'SKIPPED', processedAt: new Date() },
        })
        return { status: 'skipped', reason: `Unrecognised status "${Status}" — no action taken` }
      }

      await prisma.order.update({
        where: { id: order.id },
        data:  { shippingStatus: mappedStatus },
      })

      await prisma.webhookLog.update({
        where: { id: log.id },
        data:  { status: 'SUCCESS', processedAt: new Date() },
      })

      return { status: 'success', awb: AWB, shippingStatus: mappedStatus }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: message },
      })
      throw err
    }
  },
}
