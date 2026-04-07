import { useState, useEffect, useCallback } from 'react'

export interface SavedAddress {
  customerName:  string
  customerPhone: string
  address:       string
  city:          string
  state:         string
  pincode:       string
}

const KEY = 'vami-saved-address'

export function useSavedAddress() {
  const [saved, setSaved] = useState<SavedAddress | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setSaved(JSON.parse(raw) as SavedAddress)
    } catch {}
    setLoaded(true)
  }, [])

  const save = useCallback((addr: SavedAddress) => {
    const clean: SavedAddress = {
      customerName:  addr.customerName.trim(),
      customerPhone: addr.customerPhone.trim(),
      address:       addr.address.trim(),
      city:          addr.city.trim(),
      state:         addr.state.trim(),
      pincode:       addr.pincode.trim(),
    }
    try { localStorage.setItem(KEY, JSON.stringify(clean)) } catch {}
    setSaved(clean)
  }, [])

  const clear = useCallback(() => {
    try { localStorage.removeItem(KEY) } catch {}
    setSaved(null)
  }, [])

  return { saved, loaded, save, clear }
}
