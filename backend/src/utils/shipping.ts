// Delivery fee policy
//   subtotal (after discount) >= FREE_SHIPPING_THRESHOLD  → free
//   below threshold                                       → flat ₹80

export const FREE_SHIPPING_THRESHOLD = 2400
export const FLAT_DELIVERY_FEE       = 80

export function calcShippingFee(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount <= 0) return 0
  return subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_DELIVERY_FEE
}
