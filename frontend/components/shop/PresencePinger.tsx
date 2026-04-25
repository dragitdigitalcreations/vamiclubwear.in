'use client'

import { useEffect } from 'react'
import { presenceApi } from '@/lib/api'

const HEARTBEAT_MS = 20_000

/**
 * Mounted once inside the storefront layout. Generates a per-tab session id
 * (sessionStorage) and pings the backend every 20s while the tab is alive,
 * so the admin dashboard can show a "concurrent users" count.
 */
export function PresencePinger() {
  useEffect(() => {
    let sessionId = ''
    try {
      sessionId = sessionStorage.getItem('vami-presence-id') ?? ''
      if (!sessionId) {
        sessionId = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
        sessionStorage.setItem('vami-presence-id', sessionId)
      }
    } catch {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

    function ping() {
      if (typeof document !== 'undefined' && document.hidden) return
      presenceApi.heartbeat(sessionId)
    }
    ping()
    const id = setInterval(ping, HEARTBEAT_MS)
    const onVisible = () => { if (!document.hidden) ping() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  return null
}
