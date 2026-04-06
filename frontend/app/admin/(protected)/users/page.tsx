'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { request } from '@/lib/api'
import { toast } from '@/stores/toastStore'

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'MANAGER'
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export default function UsersPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request<AdminUser[]>('/admin/users')
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <RBACGuard section="users">
      <AdminHeader title="Users" subtitle={`${users.length} admin users`} />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Manage admin access and roles</p>
          <Button className="gap-2" disabled>
            <UserPlus className="h-4 w-4" />
            Invite User
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-on-background">{u.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </RBACGuard>
  )
}
