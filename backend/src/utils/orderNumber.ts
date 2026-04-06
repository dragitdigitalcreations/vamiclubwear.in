// Generates a human-readable, sortable order number
// Format: VCW-YYMMDD-XXXX  (e.g. VCW-250405-0001)

let dailySequence = 0
let lastDate = ''

export function generateOrderNumber(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD

  // Reset sequence on new day
  if (dateStr !== lastDate) {
    dailySequence = 0
    lastDate = dateStr
  }

  dailySequence += 1
  const seq = String(dailySequence).padStart(4, '0')
  return `VCW-${dateStr}-${seq}`
}
