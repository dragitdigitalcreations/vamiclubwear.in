/**
 * Email service using Nodemailer (Gmail App Password or any SMTP).
 *
 * Required env vars:
 *   SMTP_USER   — Gmail address  e.g.  vami.clubwear@gmail.com
 *   SMTP_PASS   — Gmail App Password (16-char, no spaces) from
 *                 Google Account → Security → 2-Step Verification → App Passwords
 *
 * Optional:
 *   SMTP_FROM       — "Vami Clubwear <vami.clubwear@gmail.com>"
 *   STORE_EMAIL     — admin notification recipient (defaults to SMTP_USER)
 *   SMTP_HOST       — override host (default: smtp.gmail.com)
 *   SMTP_PORT       — override port (default: 465)
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let _transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user, pass },
  })
  return _transporter
}

const from = () =>
  process.env.SMTP_FROM ?? `Vami Clubwear <${process.env.SMTP_USER ?? 'noreply@vamiclubwear.in'}>`

const storeEmail = () => process.env.STORE_EMAIL ?? process.env.SMTP_USER ?? ''

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
  const t = getTransporter()
  if (!t || !data.customerEmail) return

  const html = wrapHtml(`
    <div class="body">
      <h2>Thank you for your order${data.customerName ? `, ${data.customerName.split(' ')[0]}` : ''}!</h2>
      <p>We've received your order and our team will contact you shortly to confirm and arrange delivery.</p>
      <div class="order-num">${data.orderNumber}</div>
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
      <p><span class="badge">Payment on delivery</span></p>
      <p style="margin-top:20px;font-size:13px;color:#777;">
        Keep this order number handy. Our team will reach out to confirm delivery details.
        For any queries, simply reply to this email.
      </p>
    </div>
  `)

  await t.sendMail({
    from: from(),
    to:   data.customerEmail,
    subject: `Order Confirmed — ${data.orderNumber} | Vami Clubwear`,
    html,
    text: `Thank you for your order ${data.orderNumber}! Total: ₹${data.total.toLocaleString('en-IN')}. Our team will contact you shortly.`,
  })
}

export async function sendOrderNotificationToStore(data: OrderEmailData): Promise<void> {
  const t  = getTransporter()
  const to = storeEmail()
  if (!t || !to) return

  const html = wrapHtml(`
    <div class="body">
      <h2>New Order Received</h2>
      <div class="order-num">${data.orderNumber}</div>
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

  await t.sendMail({
    from: from(),
    to,
    subject: `[NEW ORDER] ${data.orderNumber} — ₹${data.total.toLocaleString('en-IN')}`,
    html,
    text: `New order ${data.orderNumber} — ₹${data.total.toLocaleString('en-IN')}`,
  })
}

// ─── Shipment created (to customer) ──────────────────────────────────────────

interface ShipmentEmailData extends OrderEmailData {
  awbNumber:  string
  trackingUrl: string
}

export async function sendShipmentCreatedEmail(data: ShipmentEmailData): Promise<void> {
  const t = getTransporter()
  if (!t || !data.customerEmail) return

  const html = wrapHtml(`
    <div class="body">
      <h2>Your order is on its way${data.customerName ? `, ${data.customerName.split(' ')[0]}` : ''}!</h2>
      <p>Great news — your Vami Clubwear order has been shipped and is heading to you.</p>
      <div class="order-num">${data.orderNumber}</div>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 14px;background:#f7f3ef;font-size:12px;color:#888;width:140px;">AWB / Tracking No.</td>
          <td style="padding:10px 14px;font-weight:700;font-family:monospace;">${data.awbNumber}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;background:#f7f3ef;font-size:12px;color:#888;">Carrier</td>
          <td style="padding:10px 14px;">Delhivery</td>
        </tr>
      </table>
      <p>
        <a href="${data.trackingUrl}" style="display:inline-block;background:#5c4033;color:#fff;padding:12px 28px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.05em;border-radius:2px;">
          Track Your Order
        </a>
      </p>
      <table class="items" style="margin-top:24px;">
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
      <p style="font-size:12px;color:#999;margin-top:20px;">
        Expected delivery: 3–7 business days. For any issues, reply to this email.
      </p>
    </div>
  `)

  await t.sendMail({
    from: from(),
    to:   data.customerEmail,
    subject: `Your order ${data.orderNumber} has been shipped! 🚚`,
    html,
    text: `Your order ${data.orderNumber} has been shipped. AWB: ${data.awbNumber}. Track at: ${data.trackingUrl}`,
  })
}

// ─── Delivery confirmation (to customer) ─────────────────────────────────────

interface DeliveryEmailData {
  orderNumber:   string
  customerName?: string | null
  customerEmail?: string | null
  total:         number
}

export async function sendDeliveryConfirmationEmail(data: DeliveryEmailData): Promise<void> {
  const t = getTransporter()
  if (!t || !data.customerEmail) return

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

  await t.sendMail({
    from: from(),
    to:   data.customerEmail,
    subject: `Delivered: Order ${data.orderNumber} | Vami Clubwear`,
    html,
    text: `Your order ${data.orderNumber} has been delivered. Thank you for shopping with Vami Clubwear!`,
  })
}

// ─── Admin invite email ───────────────────────────────────────────────────────

export async function sendAdminInvite(opts: {
  to:       string
  name:     string
  role:     string
  tempPass: string
  loginUrl: string
}): Promise<void> {
  const t = getTransporter()
  if (!t) return

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

  await t.sendMail({
    from: from(),
    to:   opts.to,
    subject: `You've been invited to Vami Clubwear Admin`,
    html,
    text: `You've been invited. Email: ${opts.to}, Password: ${opts.tempPass}. Login at: ${opts.loginUrl}`,
  })
}
