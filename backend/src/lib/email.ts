/**
 * Email service via Resend (HTTP API — works on Railway which blocks SMTP).
 *
 * Required env vars:
 *   RESEND_API_KEY  — from resend.com dashboard
 *
 * Optional:
 *   RESEND_FROM     — sender address, default: orders@vamiclubwear.in
 *                     Must match a verified domain in your Resend account.
 *   STORE_EMAIL     — admin notification recipient, default: vamiclubwear@gmail.com
 */

import { Resend } from 'resend'

let _resend: Resend | null = null
let _warnedMissingKey = false

function getResend(): Resend | null {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (!_warnedMissingKey) {
      console.error('[email] RESEND_API_KEY is not set — all transactional emails will be skipped')
      _warnedMissingKey = true
    }
    return null
  }
  _resend = new Resend(key)
  return _resend
}

const from = () => process.env.RESEND_FROM ?? 'Vami Clubwear <orders@vamiclubwear.in>'
const storeEmail = () => process.env.STORE_EMAIL ?? 'vamiclubwear@gmail.com'

async function send(to: string, subject: string, html: string, text: string) {
  const r = getResend()
  if (!r) {
    console.warn(`[email] Skipped send to ${to} (subject: "${subject}") — Resend not configured`)
    return
  }
  try {
    const result = await r.emails.send({ from: from(), to, subject, html, text })
    if ((result as any)?.error) {
      console.error(`[email] Resend rejected send to ${to}:`, (result as any).error)
    } else {
      console.log(`[email] Sent to ${to} (subject: "${subject}")`, (result as any)?.data?.id ?? '')
    }
  } catch (err) {
    console.error(`[email] Send failed to ${to} (subject: "${subject}"):`, err)
    throw err
  }
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vami Clubwear</title>
<style>
  body{margin:0;padding:0;background:#f4f0ec;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .header{background:#1e1e1e;padding:32px 40px;text-align:center}
  .header h1{margin:0;font-size:22px;font-weight:700;letter-spacing:.15em;color:#e8d9c8;text-transform:uppercase}
  .header p{margin:4px 0 0;font-size:11px;letter-spacing:.2em;color:#888;text-transform:uppercase}
  .body{padding:36px 40px}
  .body h2{margin:0 0 20px;font-size:18px;font-weight:600;color:#1a1a1a}
  .body p{margin:0 0 16px;font-size:14px;line-height:1.6;color:#555}
  .order-num{background:#f7f3ef;border-left:3px solid #5c4033;padding:12px 16px;margin:20px 0;font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:.1em}
  table.items{width:100%;border-collapse:collapse;margin:20px 0}
  table.items th{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#888;border-bottom:1px solid #eee;padding:8px 0;text-align:left}
  table.items td{padding:10px 0;font-size:13px;color:#333;border-bottom:1px solid #f5f5f5;vertical-align:top}
  table.items td.right{text-align:right}
  .total-row td{font-weight:700;font-size:14px;color:#1a1a1a;border-top:2px solid #eee;padding-top:12px}
  .badge{display:inline-block;background:#5c4033;color:#fff;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:2px}
  .footer{background:#f7f3ef;padding:20px 40px;text-align:center}
  .footer p{margin:0;font-size:11px;color:#999;line-height:1.8}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Vami Clubwear</h1>
    <p>Manjeri, Kerala</p>
  </div>
  ${body}
  <div class="footer">
    <p>Vami Clubwear · Manjeri, Kerala<br/>Questions? Reply to this email or contact us on WhatsApp.</p>
  </div>
</div>
</body>
</html>`
}

// ─── Order confirmation (to customer) ────────────────────────────────────────

interface OrderItem {
  name:     string
  sku:      string
  size?:    string | null
  color?:   string | null
  qty:      number
  price:    number
}

interface OrderEmailData {
  orderNumber:   string
  customerName?: string | null
  customerEmail?: string | null
  items:         OrderItem[]
  total:         number
  fulfillmentType?: 'DELIVERY' | 'PICKUP'
}

const STORE_ADDRESS_HTML = `Vami Clubwear<br/>Manjeri, Malappuram<br/>Kerala — 676121, India`
const STORE_ADDRESS_TEXT = 'Vami Clubwear, Manjeri, Malappuram, Kerala — 676121, India'
const STORE_MAPS_URL = 'https://maps.app.goo.gl/whKHwKHBWcTGnRny9'

function mapsButton(): string {
  return `<div style="margin-top:12px;">
    <a href="${STORE_MAPS_URL}" style="display:inline-block;background:#5c4033;color:#fff;padding:9px 18px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;">
      Get Directions →
    </a>
  </div>`
}

function buildOrderRows(items: OrderItem[]): string {
  return items.map((i) => {
    const attrs = [i.size, i.color].filter(Boolean).join(' · ')
    return `<tr>
      <td>
        <strong>${i.name}</strong><br/>
        <span style="color:#888;font-size:12px;">${attrs || i.sku}</span>
      </td>
      <td class="right">${i.qty}</td>
      <td class="right">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
    </tr>`
  }).join('')
}

export async function sendOrderConfirmationToCustomer(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const isPickup = data.fulfillmentType === 'PICKUP'

  const fulfillmentBlock = isPickup
    ? `<div style="margin:18px 0;padding:14px 16px;background:#f7f3ef;border-left:3px solid #5c4033;">
         <div style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#5c4033;">Collect from Shop</div>
         <div style="margin-top:6px;font-size:13px;color:#1a1a1a;line-height:1.6;">${STORE_ADDRESS_HTML}</div>
         <div style="margin-top:6px;font-size:12px;color:#666;">We'll email you again as soon as your order is ready to be picked up.</div>
         ${mapsButton()}
       </div>`
    : ''

  const closingLine = isPickup
    ? `Keep this order number handy. We'll email you again as soon as your order is ready to be collected from our Manjeri store. For any queries, simply reply to this email.`
    : `Keep this order number handy. We're preparing your order for dispatch and will email your tracking link as soon as it ships. For any queries, simply reply to this email.`

  const introLine = isPickup
    ? `We've received your order. Our team will get it ready and email you again the moment it's ready to collect from our store.`
    : `We've received your order and our team will contact you shortly to confirm and arrange delivery.`

  const html = wrapHtml(`
    <div class="body">
      <h2>Thank you for your order${data.customerName ? `, ${data.customerName.split(' ')[0]}` : ''}!</h2>
      <p>${introLine}</p>
      <div class="order-num">${data.orderNumber}</div>
      ${fulfillmentBlock}
      <table class="items">
        <thead><tr>
          <th>Item</th>
          <th class="right">Qty</th>
          <th class="right">Amount</th>
        </tr></thead>
        <tbody>${buildOrderRows(data.items)}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="2">Total Paid</td>
          <td class="right">₹${data.total.toLocaleString('en-IN')}</td>
        </tr></tfoot>
      </table>
      <p><span class="badge" style="background:#2e7d32;">✓ Payment Received</span></p>
      <p style="margin-top:20px;font-size:13px;color:#777;">${closingLine}</p>
    </div>
  `)
  await send(
    data.customerEmail,
    `Order Confirmed — ${data.orderNumber} | Vami Clubwear`,
    html,
    isPickup
      ? `Thank you for your order ${data.orderNumber}! Payment of ₹${data.total.toLocaleString('en-IN')} received. You chose to collect from our shop — we'll email you when it's ready. ${STORE_ADDRESS_TEXT}. Directions: ${STORE_MAPS_URL}`
      : `Thank you for your order ${data.orderNumber}! Payment of ₹${data.total.toLocaleString('en-IN')} received. We'll email tracking details as soon as your order ships.`,
  )
}

export async function sendOrderNotificationToStore(data: OrderEmailData): Promise<void> {
  const to = storeEmail()
  if (!to) return
  const isPickup = data.fulfillmentType === 'PICKUP'
  const html = wrapHtml(`
    <div class="body">
      <h2>New Order Received${isPickup ? ' — STORE PICKUP' : ''}</h2>
      <div class="order-num">${data.orderNumber}</div>
      ${isPickup ? `<p><span class="badge" style="background:#5c4033;">Collect from Shop</span></p>` : ''}
      ${data.customerName  ? `<p><strong>Customer:</strong> ${data.customerName}</p>` : ''}
      ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
      <table class="items">
        <thead><tr>
          <th>Item</th>
          <th class="right">Qty</th>
          <th class="right">Amount</th>
        </tr></thead>
        <tbody>${buildOrderRows(data.items)}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="2">Total</td>
          <td class="right">₹${data.total.toLocaleString('en-IN')}</td>
        </tr></tfoot>
      </table>
    </div>
  `)
  await send(
    to,
    `[NEW ORDER${isPickup ? ' · PICKUP' : ''}] ${data.orderNumber} — ₹${data.total.toLocaleString('en-IN')}`,
    html,
    `New ${isPickup ? 'pickup ' : ''}order ${data.orderNumber} — ₹${data.total.toLocaleString('en-IN')}`,
  )
}

// ─── Pickup ready (to customer) ──────────────────────────────────────────────

interface PickupReadyEmailData {
  orderNumber:   string
  customerName?: string | null
  customerEmail?: string | null
}

export async function sendPickupReadyEmail(data: PickupReadyEmailData): Promise<void> {
  if (!data.customerEmail) return
  const html = wrapHtml(`
    <div class="body">
      <h2>Your order is ready to collect${data.customerName ? `, ${data.customerName.split(' ')[0]}` : ''}!</h2>
      <p>Good news — your Vami Clubwear order is packed and waiting for you at our store.</p>
      <div class="order-num">${data.orderNumber}</div>
      <div style="margin:18px 0;padding:14px 16px;background:#f7f3ef;border-left:3px solid #5c4033;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#5c4033;">Collect From</div>
        <div style="margin-top:6px;font-size:13px;color:#1a1a1a;line-height:1.6;">${STORE_ADDRESS_HTML}</div>
        <div style="margin-top:6px;font-size:12px;color:#666;">Please carry this order number for verification.</div>
        ${mapsButton()}
      </div>
      <p style="margin-top:20px;font-size:13px;color:#777;">
        Reply to this email or message us on WhatsApp at +91 90616 07608 if you need directions or want to confirm a pickup time.
      </p>
    </div>
  `)
  await send(
    data.customerEmail,
    `Ready to Collect — ${data.orderNumber} | Vami Clubwear`,
    html,
    `Your order ${data.orderNumber} is ready to collect at ${STORE_ADDRESS_TEXT}. Directions: ${STORE_MAPS_URL}`,
  )
}

// ─── Shipment created — INVOICE-style email (to customer) ───────────────────

interface InvoiceItem {
  name:    string
  sku:     string
  size?:   string | null
  color?:  string | null
  qty:     number
  price:   number          // unit price
  barcode?: string | null  // product (or per-colour) barcode for traceability
}

interface ShipmentInvoiceData {
  orderNumber:   string
  invoiceNumber?: string | null
  invoiceDate:   Date
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  shippingAddress?: string | null
  shippingCity?:    string | null
  shippingState?:   string | null
  shippingPincode?: string | null
  awbNumber:    string
  trackingUrl:  string
  items:        InvoiceItem[]
  subtotal:     number
  discount:     number
  couponCode?:  string | null
  shippingFee:  number
  total:        number
}

const SITE_URL = () => process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.vamiclubwear.in'

// Free, reliable Code128 barcode-image generator. Most email clients render
// external images on first open; if blocked, the barcode value is also shown
// as monospace text below it so traceability is never lost.
function barcodeImg(value: string): string {
  const encoded = encodeURIComponent(value)
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encoded}&scale=2&height=10&includetext=false&backgroundcolor=ffffff`
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildInvoiceRows(items: InvoiceItem[]): string {
  return items.map((i, idx) => {
    const attrs = [i.size, i.color].filter(Boolean).join(' · ')
    const total = i.price * i.qty
    return `<tr>
      <td style="padding:14px 8px;border-bottom:1px solid #e6e6e6;font-size:12px;color:#888;width:32px;text-align:center;">${idx + 1}</td>
      <td style="padding:14px 8px;border-bottom:1px solid #e6e6e6;">
        <div style="font-size:13px;font-weight:600;color:#1a1a1a;">${i.name}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;">${attrs || '—'}</div>
        <div style="font-size:10px;color:#aaa;margin-top:4px;font-family:monospace;">SKU: ${i.sku}</div>
        ${i.barcode ? `
          <div style="margin-top:8px;">
            <img src="${barcodeImg(i.barcode)}" alt="${i.barcode}" style="display:block;height:34px;width:auto;max-width:180px;background:#fff;" />
            <div style="font-size:10px;color:#888;font-family:monospace;letter-spacing:.05em;margin-top:2px;">${i.barcode}</div>
          </div>` : ''}
      </td>
      <td style="padding:14px 8px;border-bottom:1px solid #e6e6e6;font-size:13px;color:#444;text-align:right;">${fmtINR(i.price)}</td>
      <td style="padding:14px 8px;border-bottom:1px solid #e6e6e6;font-size:13px;color:#444;text-align:center;">${i.qty}</td>
      <td style="padding:14px 8px;border-bottom:1px solid #e6e6e6;font-size:13px;font-weight:600;color:#1a1a1a;text-align:right;">${fmtINR(total)}</td>
    </tr>`
  }).join('')
}

export async function sendShipmentCreatedEmail(data: ShipmentInvoiceData): Promise<void> {
  if (!data.customerEmail) return

  // GST is included in displayed prices in India for B2C apparel. Apparel
  // attracts 5% GST when MRP ≤ ₹1000, 12% above — split it out for the
  // invoice so the customer can see the tax component.
  const taxableSubtotal = Math.max(0, data.subtotal - data.discount)
  const gstRate         = data.subtotal > 1000 ? 0.12 : 0.05
  const taxIncluded     = +(taxableSubtotal - taxableSubtotal / (1 + gstRate)).toFixed(2)
  const taxLabel        = data.subtotal > 1000 ? 'GST 12% (incl.)' : 'GST 5% (incl.)'

  const billingLines = [
    data.customerName,
    data.shippingAddress,
    [data.shippingCity, data.shippingState, data.shippingPincode].filter(Boolean).join(', '),
    data.customerPhone ? `Phone: ${data.customerPhone}` : null,
    data.customerEmail,
  ].filter(Boolean) as string[]

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice — ${data.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#ececec;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:680px;margin:24px auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.1);">

    <!-- Top notice strip -->
    <div style="background:#1e1e1e;padding:18px 36px;color:#e8d9c8;text-align:center;">
      <div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#a08066;">Your order is on its way</div>
      <div style="font-size:16px;margin-top:4px;color:#fff;">Tax Invoice &amp; Shipment Note</div>
    </div>

    <!-- Header: brand + INVOICE block -->
    <div style="display:flex;justify-content:space-between;align-items:stretch;padding:32px 36px 20px 36px;border-bottom:1px solid #f0f0f0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
        <td valign="top" style="padding-right:20px;">
          <div style="display:inline-block;width:36px;height:36px;background:#5c4033;border-radius:50%;text-align:center;line-height:36px;color:#fff;font-weight:700;font-size:18px;letter-spacing:.05em;vertical-align:middle;">V</div>
          <span style="display:inline-block;margin-left:10px;vertical-align:middle;">
            <div style="font-size:18px;font-weight:800;letter-spacing:.18em;color:#1a1a1a;">VAMI</div>
            <div style="font-size:9px;letter-spacing:.3em;color:#888;text-transform:uppercase;margin-top:2px;">Clubwear®</div>
          </span>
          <div style="margin-top:14px;font-size:11px;color:#888;line-height:1.6;">
            Vami Clubwear<br/>Manjeri, Malappuram<br/>Kerala — 676121, India<br/>vamiclubwear@gmail.com
          </div>
        </td>
        <td valign="top" align="right" width="180">
          <div style="background:#1e1e1e;color:#fff;padding:14px 20px;display:inline-block;text-align:left;min-width:160px;">
            <div style="font-size:22px;font-weight:800;letter-spacing:.12em;">INVOICE</div>
            <div style="font-size:10px;letter-spacing:.18em;color:#a08066;text-transform:uppercase;margin-top:8px;">Invoice #</div>
            <div style="font-size:12px;color:#fff;font-family:monospace;">${data.invoiceNumber || data.orderNumber}</div>
            <div style="font-size:10px;letter-spacing:.18em;color:#a08066;text-transform:uppercase;margin-top:8px;">Order #</div>
            <div style="font-size:12px;color:#fff;font-family:monospace;">${data.orderNumber}</div>
            <div style="font-size:10px;letter-spacing:.18em;color:#a08066;text-transform:uppercase;margin-top:8px;">Date</div>
            <div style="font-size:12px;color:#fff;">${fmtDate(data.invoiceDate)}</div>
          </div>
        </td>
      </tr></table>
    </div>

    <!-- Bill To + Ship Via -->
    <div style="padding:24px 36px 8px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
        <td valign="top" style="width:50%;padding-right:18px;">
          <div style="font-size:10px;letter-spacing:.22em;color:#888;text-transform:uppercase;font-weight:700;">Invoice To</div>
          <div style="margin-top:8px;font-size:13px;color:#1a1a1a;line-height:1.7;">
            ${billingLines.map((l) => `<div>${l}</div>`).join('')}
          </div>
        </td>
        <td valign="top" style="width:50%;padding-left:18px;border-left:1px solid #f0f0f0;">
          <div style="font-size:10px;letter-spacing:.22em;color:#888;text-transform:uppercase;font-weight:700;">Ship Via</div>
          <div style="margin-top:8px;font-size:13px;color:#1a1a1a;line-height:1.7;">
            <div><strong>Delhivery</strong></div>
            <div style="font-family:monospace;font-size:12px;color:#444;">AWB: ${data.awbNumber}</div>
            <div style="margin-top:6px;">
              <img src="${barcodeImg(data.awbNumber)}" alt="${data.awbNumber}" style="display:block;height:38px;width:auto;max-width:240px;background:#fff;" />
            </div>
            <div style="margin-top:10px;">
              <a href="${data.trackingUrl}" style="display:inline-block;background:#5c4033;color:#fff;padding:9px 18px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;">
                Track Order →
              </a>
            </div>
          </div>
        </td>
      </tr></table>
    </div>

    <!-- Items table -->
    <div style="padding:18px 36px 0 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#1e1e1e;color:#fff;">
            <th style="padding:11px 8px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;text-align:center;width:32px;">#</th>
            <th style="padding:11px 8px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;text-align:left;">Description</th>
            <th style="padding:11px 8px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;text-align:right;width:80px;">Price</th>
            <th style="padding:11px 8px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;text-align:center;width:48px;">Qty</th>
            <th style="padding:11px 8px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;text-align:right;width:90px;">Total</th>
          </tr>
        </thead>
        <tbody>${buildInvoiceRows(data.items)}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:14px 36px 24px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
        <td style="width:55%;font-size:11px;color:#888;line-height:1.6;padding-right:24px;vertical-align:top;">
          <div style="font-size:10px;letter-spacing:.22em;color:#888;text-transform:uppercase;font-weight:700;">Payment</div>
          <div style="margin-top:6px;color:#1a1a1a;font-size:12px;">Razorpay (Online · Prepaid)</div>
          <div style="margin-top:14px;font-size:10px;letter-spacing:.22em;color:#888;text-transform:uppercase;font-weight:700;">Notes</div>
          <div style="margin-top:6px;font-size:11px;color:#666;">All amounts are in Indian Rupees and inclusive of applicable GST. This invoice is generated electronically and is valid without a signature.</div>
        </td>
        <td style="width:45%;vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-size:13px;">
            <tr>
              <td style="padding:6px 0;color:#666;">Subtotal</td>
              <td style="padding:6px 0;text-align:right;color:#1a1a1a;">${fmtINR(data.subtotal)}</td>
            </tr>
            ${data.discount > 0 ? `
            <tr>
              <td style="padding:6px 0;color:#666;">Discount${data.couponCode ? ` (${data.couponCode})` : ''}</td>
              <td style="padding:6px 0;text-align:right;color:#2e7d32;">− ${fmtINR(data.discount)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;color:#666;">${taxLabel}</td>
              <td style="padding:6px 0;text-align:right;color:#1a1a1a;">${fmtINR(taxIncluded)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Shipping</td>
              <td style="padding:6px 0;text-align:right;color:${data.shippingFee === 0 ? '#2e7d32' : '#1a1a1a'};">${data.shippingFee === 0 ? 'FREE' : fmtINR(data.shippingFee)}</td>
            </tr>
            <tr>
              <td colspan="2" style="border-top:2px solid #1e1e1e;padding-top:6px;"></td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-weight:700;color:#1a1a1a;font-size:14px;">Grand Total</td>
              <td style="padding:8px 0;text-align:right;font-weight:800;color:#1a1a1a;font-size:16px;">${fmtINR(data.total)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:4px;font-size:10px;color:#999;text-align:right;">Paid in full</td>
            </tr>
          </table>
        </td>
      </tr></table>
    </div>

    <!-- Thank you / footer -->
    <div style="background:#f7f3ef;padding:22px 36px;border-top:1px solid #f0f0f0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
        <td valign="top">
          <div style="font-size:13px;font-weight:700;color:#1a1a1a;">Thank you${data.customerName ? `, ${data.customerName.split(' ')[0]}` : ''}!</div>
          <div style="margin-top:4px;font-size:11px;color:#888;line-height:1.6;">
            Expected delivery: 3–7 business days. Track anytime using the button above.<br/>
            Questions? Reply to this email or message us on WhatsApp at +91 90616 07608.
          </div>
        </td>
        <td valign="top" align="right" style="width:160px;">
          <div style="font-size:10px;letter-spacing:.22em;color:#888;text-transform:uppercase;">Visit</div>
          <div style="margin-top:4px;"><a href="${SITE_URL()}" style="font-size:12px;color:#5c4033;text-decoration:none;">vamiclubwear.in</a></div>
        </td>
      </tr></table>
    </div>

  </div>
</body>
</html>`

  const text =
    `Invoice for order ${data.orderNumber}\n` +
    `Date: ${fmtDate(data.invoiceDate)}\n` +
    `AWB: ${data.awbNumber} (Delhivery)\n` +
    `Track: ${data.trackingUrl}\n\n` +
    data.items.map((i) => `${i.name} (${i.sku})${i.barcode ? ` — barcode ${i.barcode}` : ''} ×${i.qty} = ${fmtINR(i.price * i.qty)}`).join('\n') +
    `\n\nSubtotal: ${fmtINR(data.subtotal)}` +
    (data.discount > 0 ? `\nDiscount${data.couponCode ? ` (${data.couponCode})` : ''}: -${fmtINR(data.discount)}` : '') +
    `\n${taxLabel}: ${fmtINR(taxIncluded)}` +
    `\nShipping: ${data.shippingFee === 0 ? 'FREE' : fmtINR(data.shippingFee)}` +
    `\nGrand Total: ${fmtINR(data.total)}\n\nPaid in full · Razorpay`

  await send(
    data.customerEmail,
    `Invoice & Tracking — ${data.orderNumber} | Vami Clubwear`,
    html,
    text,
  )
}

// ─── Delivery confirmation (to customer) ─────────────────────────────────────

interface DeliveryEmailData {
  orderNumber:   string
  customerName?: string | null
  customerEmail?: string | null
  total:         number
}

export async function sendDeliveryConfirmationEmail(data: DeliveryEmailData): Promise<void> {
  if (!data.customerEmail) return
  const html = wrapHtml(`
    <div class="body">
      <h2>Order Delivered${data.customerName ? ` — Thank you, ${data.customerName.split(' ')[0]}` : ''}!</h2>
      <p>Your Vami Clubwear order has been successfully delivered. We hope you love your new pieces!</p>
      <div class="order-num">${data.orderNumber}</div>
      <p style="margin-top:20px;">
        <span class="badge" style="background:#2e7d32;">✓ Delivered</span>
      </p>
      <p style="margin-top:20px;font-size:13px;color:#777;">
        If you have any questions or concerns about your order, please reply to this email
        or reach us on WhatsApp. We'd love to hear your feedback!
      </p>
    </div>
  `)
  await send(data.customerEmail, `Delivered: Order ${data.orderNumber} | Vami Clubwear`, html,
    `Your order ${data.orderNumber} has been delivered. Thank you for shopping with Vami Clubwear!`)
}

// ─── Admin invite email ───────────────────────────────────────────────────────

export async function sendAdminInvite(opts: {
  to:       string
  name:     string
  role:     string
  tempPass: string
  loginUrl: string
}): Promise<void> {
  const html = wrapHtml(`
    <div class="body">
      <h2>You've been added to Vami Clubwear Admin</h2>
      <p>Hi ${opts.name},</p>
      <p>Your admin account has been created with the role <strong>${opts.role}</strong>.</p>
      <p>Sign in with these credentials:</p>
      <table style="margin:20px 0;border:1px solid #eee;width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 14px;background:#f7f3ef;font-size:12px;color:#888;width:120px">Email</td>
            <td style="padding:10px 14px;font-weight:600">${opts.to}</td></tr>
        <tr><td style="padding:10px 14px;background:#f7f3ef;font-size:12px;color:#888">Password</td>
            <td style="padding:10px 14px;font-family:monospace;font-weight:600">${opts.tempPass}</td></tr>
      </table>
      <p>
        <a href="${opts.loginUrl}" style="display:inline-block;background:#5c4033;color:#fff;padding:12px 28px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.05em;border-radius:2px">
          Sign In to Admin Panel
        </a>
      </p>
      <p style="font-size:12px;color:#999;margin-top:20px;">
        Please change your password after your first login.
      </p>
    </div>
  `)
  await send(opts.to, `You've been invited to Vami Clubwear Admin`, html,
    `You've been invited. Email: ${opts.to}, Password: ${opts.tempPass}. Login at: ${opts.loginUrl}`)
}
