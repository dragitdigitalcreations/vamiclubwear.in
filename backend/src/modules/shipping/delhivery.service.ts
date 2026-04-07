/**
 * Delhivery API Service
 *
 * Required env vars:
 *   DELHIVERY_TOKEN       — API token from Delhivery dashboard
 *   DELHIVERY_PICKUP_NAME — Pickup location name registered in Delhivery (default: "Primary")
 *   DELHIVERY_BASE_URL    — API base (default: https://track.delhivery.com)
 *                           Use https://staging-express.delhivery.com for sandbox
 *   STORE_PINCODE         — Return/pickup pincode (default: 676122 for Manjeri)
 *   STORE_ADDRESS         — Return address (default: Manjeri, Kerala)
 *   STORE_CITY            — Return city (default: Manjeri)
 *   STORE_STATE           — Return state (default: Kerala)
 *   STORE_PHONE           — Return phone
 */

const BASE = () => process.env.DELHIVERY_BASE_URL ?? 'https://track.delhivery.com'
const TOKEN = () => process.env.DELHIVERY_TOKEN ?? ''
const PICKUP = () => process.env.DELHIVERY_PICKUP_NAME ?? 'Primary'

function headers() {
  return {
    Authorization:  `Token ${TOKEN()}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  }
}

export interface DelhiveryShipmentInput {
  orderNumber:  string
  customerName: string
  phone:        string
  address:      string
  city:         string
  state:        string
  pincode:      string
  totalAmount:  number
  paymentMode:  'COD' | 'Prepaid'
  productDesc:  string
  weight?:      number  // kg, default 0.5
}

export interface DelhiveryShipmentResult {
  awbNumber:  string
  trackingUrl: string
  shipmentId: string
}

/**
 * Creates a shipment on Delhivery.
 * Returns AWB number + tracking URL on success.
 * Throws if Delhivery token is not configured or API fails.
 */
export async function createDelhiveryShipment(
  input: DelhiveryShipmentInput
): Promise<DelhiveryShipmentResult> {
  const token = TOKEN()
  if (!token) throw new Error('DELHIVERY_TOKEN is not configured')

  const shipmentPayload = {
    shipments: [
      {
        name:              input.customerName,
        add:               input.address,
        city:              input.city,
        state:             input.state,
        country:           'India',
        pin:               input.pincode,
        phone:             input.phone,
        payment_mode:      input.paymentMode,
        order:             input.orderNumber,
        total_amount:      input.totalAmount,
        cod_amount:        input.paymentMode === 'COD' ? input.totalAmount : 0,
        weight:            input.weight ?? 0.5,
        products_desc:     input.productDesc,
        seller_inv:        input.orderNumber,
        waybill:           '',
        seller_name:       'Vami Clubwear',
        seller_add:        process.env.STORE_ADDRESS  ?? 'Manjeri, Kerala',
        seller_gst_tin:    '',
        return_name:       'Vami Clubwear',
        return_add:        process.env.STORE_ADDRESS  ?? 'Manjeri, Kerala',
        return_phone:      process.env.STORE_PHONE    ?? '',
        return_pin:        process.env.STORE_PINCODE  ?? '676122',
        return_city:       process.env.STORE_CITY     ?? 'Manjeri',
        return_state:      process.env.STORE_STATE    ?? 'Kerala',
        return_country:    'India',
        fragile_shipment:  false,
        invoiceNumber:     input.orderNumber,
        quantity:          1,
      },
    ],
    pickup_location: { name: PICKUP() },
  }

  const body = new URLSearchParams()
  body.append('format', 'json')
  body.append('data', JSON.stringify(shipmentPayload))

  const res = await fetch(`${BASE()}/api/cmu/create.json`, {
    method:  'POST',
    headers: { Authorization: `Token ${TOKEN()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  const json = (await res.json()) as any

  if (!res.ok || json.success === false) {
    const msg = json.rmk ?? json.error ?? JSON.stringify(json)
    throw new Error(`Delhivery create failed: ${msg}`)
  }

  const pkg = json.packages?.[0]
  if (!pkg || !pkg.waybill) {
    throw new Error(`Delhivery returned no waybill: ${JSON.stringify(json)}`)
  }

  const awb = pkg.waybill as string
  return {
    awbNumber:  awb,
    trackingUrl: `https://www.delhivery.com/track/package/${awb}`,
    shipmentId: pkg.refnum ?? awb,
  }
}

/**
 * Tracks a shipment by AWB number.
 */
export async function trackDelhiveryShipment(awb: string) {
  const token = TOKEN()
  if (!token) return null

  const res = await fetch(
    `${BASE()}/api/v1/packages/json/?waybill=${awb}&token=${token}`,
    { headers: headers() }
  )
  if (!res.ok) return null
  return res.json()
}

/**
 * Maps Delhivery webhook status string to our ShippingStatus enum.
 */
export function mapDelhiveryStatus(
  status: string
): 'SHIPPED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | null {
  const s = status.toLowerCase()
  if (s.includes('manifested') || s.includes('picked up') || s.includes('shipped')) return 'SHIPPED'
  if (s.includes('in transit') || s.includes('transit')) return 'IN_TRANSIT'
  if (s.includes('out for delivery') || s.includes('ofd')) return 'OUT_FOR_DELIVERY'
  if (s.includes('delivered')) return 'DELIVERED'
  if (s.includes('rto') || s.includes('lost') || s.includes('damaged') || s.includes('cancelled')) return 'FAILED'
  return null
}
