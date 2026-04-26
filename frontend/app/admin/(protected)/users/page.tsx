'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Loader2, Shield, ShieldOff, Copy, Check, X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { request } from '@/lib/api'
import { toast } from '@/stores/toastStore'

type Role = 'ADMIN' | 'MANAGER' | 'STAFF'

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: Role
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:   'Admin — full access including user management',
  MANAGER: 'Manager — can manage products, orders, inventory',
  STAFF:   'Staff — POS scanner only (mobile UI for in-shop sales)',
}

// Cycle order for the inline pencil button: ADMIN → MANAGER → STAFF → ADMIN
const ROLE_CYCLE: Record<Role, Role> = {
  ADMIN:   'MANAGER',
  MANAGER: 'STAFF',
  STAFF:   'ADMIN',
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (user: AdminUser, tempPass: string) => void
}) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState<Role>('MANAGER')
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name  = 'Name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await request<{ user: AdminUser; tempPass: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), role }),
      })
      onCreated(res.user, res.tempPass)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-base font-semibold text-on-background">Add Admin User</h2>
          <button onClick={onClose} className="text-muted hover:text-on-background">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Manager"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@vamiclubwear.in"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="flex h-9 w-full border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
              <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
              <option value="STAFF">{ROLE_LABELS.STAFF}</option>
            </select>
            {role === 'STAFF' && (
              <p className="text-[11px] text-amber-400">
                Staff sign in to a phone-friendly POS scanner only — no dashboard, no products, no orders.
              </p>
            )}
          </div>

          <p className="text-xs text-muted">
            A temporary password will be generated. If SMTP is configured, an invite email will be sent automatically.
          </p>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Temp Password Dialog ──────────────────────────────────────────────────────

function TempPassDialog({ user, tempPass, onClose }: { user: AdminUser; tempPass: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(tempPass).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-base font-semibold text-on-background">User Created</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted">
            <span className="text-on-background font-medium">{user.name}</span> has been added as <strong>{user.role}</strong>.
          </p>
          <p className="text-xs text-amber-400">
            Save this temporary password — it will not be shown again. Share it securely with the user.
          </p>

          <div className="flex items-center gap-2 rounded border border-border bg-surface-elevated px-3 py-2">
            <code className="flex-1 font-mono text-sm text-on-background select-all">{tempPass}</code>
            <button onClick={copy} className="text-muted hover:text-on-background transition-colors">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <p className="text-xs text-muted">
            Login email: <span className="font-medium text-on-background">{user.email}</span>
          </p>

          <Button className="w-full" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({
  user, onClose, onConfirmed,
}: {
  user: AdminUser
  onClose: () => void
  onConfirmed: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const required = user.email
  const canDelete = confirmText.trim().toLowerCase() === required.toLowerCase()

  async function doDelete() {
    if (!canDelete || busy) return
    setBusy(true)
    try {
      await request<{ ok: boolean }>(`/admin/users/${user.id}`, { method: 'DELETE' })
      toast.success(`${user.name ?? user.email} deleted`)
      onConfirmed()
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-on-background">Delete user permanently?</h2>
            <p className="text-xs text-muted">This cannot be undone.</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-background">
            <span className="font-semibold">{user.name ?? '—'}</span>
            <span className="text-muted"> · {user.email} · {user.role}</span>
          </p>
          <p className="text-xs text-muted">
            The account is removed entirely — sign-in will stop working immediately and the row vanishes from this list.
            If you only want to revoke access temporarily, use the <strong>Deactivate</strong> button instead.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Type <code className="font-mono text-on-background">{required}</code> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={required}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={!canDelete || busy}
              onClick={doDelete}
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</> : 'Delete user'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const currentUserId               = useAuthStore((s) => s.user?.id)
  const [users,        setUsers]        = useState<AdminUser[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showCreate,   setShowCreate]   = useState(false)
  const [createdResult, setCreatedResult] = useState<{ user: AdminUser; tempPass: string } | null>(null)
  const [deletingUser, setDeletingUser]   = useState<AdminUser | null>(null)

  function loadUsers() {
    setLoading(true)
    request<AdminUser[]>('/admin/users')
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  async function toggleActive(u: AdminUser) {
    try {
      const updated = await request<AdminUser>(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      toast.success(`${updated.name} ${updated.isActive ? 'activated' : 'deactivated'}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    }
  }

  async function cycleRole(u: AdminUser) {
    const next = ROLE_CYCLE[u.role]
    try {
      const updated = await request<AdminUser>(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: next }),
      })
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      toast.success(`${updated.name} is now ${updated.role}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    }
  }

  return (
    <RBACGuard section="users">
      <AdminHeader title="Users" subtitle={`${users.length} admin user${users.length !== 1 ? 's' : ''}`} />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Manage admin access and roles</p>
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-surface">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-on-background">{u.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'default' : u.role === 'STAFF' ? 'outline' : 'secondary'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-muted'}`} />
                        <span className="text-xs text-muted">{u.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => cycleRole(u)}
                          title={`Change role to ${ROLE_CYCLE[u.role]}`}
                          className="rounded p-1.5 text-muted hover:text-on-background hover:bg-surface-elevated transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          title={u.isActive ? 'Deactivate (revoke sign-in, keep account)' : 'Activate'}
                          className={`rounded p-1.5 transition-colors ${
                            u.isActive
                              ? 'text-muted hover:text-amber-400 hover:bg-amber-400/10'
                              : 'text-muted hover:text-green-400 hover:bg-green-400/10'
                          }`}
                        >
                          {u.isActive ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          disabled={u.id === currentUserId}
                          title={u.id === currentUserId ? 'You cannot delete your own account' : 'Delete user permanently'}
                          className="rounded p-1.5 text-muted transition-colors hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:hover:text-muted disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(user, tempPass) => {
            setShowCreate(false)
            setUsers((prev) => [...prev, user])
            setCreatedResult({ user, tempPass })
            toast.success(`${user.name} added successfully`)
          }}
        />
      )}

      {createdResult && (
        <TempPassDialog
          user={createdResult.user}
          tempPass={createdResult.tempPass}
          onClose={() => setCreatedResult(null)}
        />
      )}

      {deletingUser && (
        <DeleteConfirmDialog
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirmed={() => {
            setUsers((prev) => prev.filter((x) => x.id !== deletingUser.id))
            setDeletingUser(null)
          }}
        />
      )}
    </RBACGuard>
  )
}
