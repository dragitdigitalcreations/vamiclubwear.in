'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { presenceApi } from '@/lib/api'

const POLL_MS = 10_000

export function LiveUsersCard() {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const r = await presenceApi.count()
        if (!alive) return
        setCount(r.count)
        setError(false)
      } catch {
        if (alive) setError(true)
      }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Live Users</p>
          <p className="mt-2 font-display text-2xl font-bold text-on-background">
            {error ? '—' : count == null ? '…' : count.toLocaleString('en-IN')}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="relative inline-flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${error ? 'bg-destructive' : 'bg-success animate-ping opacity-75'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${error ? 'bg-destructive' : 'bg-success'}`} />
            </span>
            <span>{error ? 'offline' : 'on the site now'}</span>
          </div>
        </div>
        <div className="rounded-md bg-primary/10 p-2.5">
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  )
}
