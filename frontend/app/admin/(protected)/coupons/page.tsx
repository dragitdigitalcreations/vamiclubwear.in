'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Save, Power, Ticket } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { couponsApi, type Coupon } from '@/lib/api'
import { toast } from '@/stores/toastStore'

type Draft = {
  id?:               string
  code:              string
  description:       string
  type:              'PERCENT' | 'FIXED'
  value:             string
  minOrderAmount:    string
  maxDiscount:       string
  usageLimit:        string
  perCustomerLimit:  string
  startsAt:          string
  expiresAt:         string
  isActive:          boolean
}

const EMPTY_DRAFT: Draft = {
  code: '', description: '', type: 'PERCENT', value: '10',
  minOrderAmount: '0', maxDiscount: '', usageLimit: '5',
  perCustomerLimit: '1', startsAt: '', expiresAt: '', isActive: true,
}

function toDraft(c: Coupon): Draft {
  return {
    id:               c.id,
    code:             c.code,
    description:      c.description ?? '',
    type:             c.type,
    value:            String(c.value),
    minOrderAmount:   String(c.minOrderAmount),
    maxDiscount:      c.maxDiscount == null ? '' : String(c.maxDiscount),
    usageLimit:       String(c.usageLimit),
    perCustomerLimit: String(c.perCustomerLimit),
    startsAt:         c.startsAt  ? c.startsAt.slice(0, 16)  : '',
    expiresAt:        c.expiresAt ? c.expiresAt.slice(0, 16) : '',
    isActive:         c.isActive,
  }
}

function toPayload(d: Draft) {
  return {
    code:             d.code.trim().toUpperCase(),
    description:      d.description || undefined,
    type:             d.type,
    value:            Number(d.value || 0),
    minOrderAmount:   Number(d.minOrderAmount || 0),
    maxDiscount:      d.maxDiscount === '' ? null : Number(d.maxDiscount),
    usageLimit:       Math.max(1, Number(d.usageLimit || 1)),
    perCustomerLimit: Math.max(0, Number(d.perCustomerLimit || 0)),
    startsAt:         d.startsAt  || null,
    expiresAt:        d.expiresAt || null,
    isActive:         d.isActive,
  }
}

export default function CouponsPage() {
  const [list, setList]     = useState<Coupon[]>([])
  const [loading, setL]     = useState(true)
  const [draft, setDraft]   = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  async function reload() {
    setL(true)
    try { setList(await couponsApi.list()) }
    catch (e: any) { toast.error(e?.message ?? 'Failed to load coupons') }
    finally { setL(false) }
  }
  useEffect(() => { reload() }, [])

  const editing = useMemo(() => Boolean(draft.id), [draft.id])

  async function save() {
    if (!draft.code.trim()) { toast.error('Code is required'); return }
    if (!Number(draft.value)) { toast.error('Value must be greater than 0'); return }
    setSaving(true)
    try {
      if (draft.id) await couponsApi.update(draft.id, toPayload(draft) as any)
      else          await couponsApi.create(toPayload(draft) as any)
      toast.success(draft.id ? 'Coupon updated' : 'Coupon created')
      setDraft(EMPTY_DRAFT)
      reload()
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  async function toggle(c: Coupon) {
    try {
      await couponsApi.update(c.id, { isActive: !c.isActive })
      reload()
    } catch (e: any) { toast.error(e?.message ?? 'Update failed') }
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete code ${c.code}?`)) return
    try { await couponsApi.delete(c.id); reload() }
    catch (e: any) { toast.error(e?.message ?? 'Delete failed') }
  }

  return (
    <>
      <AdminHeader title="Coupons" subtitle="Issue and manage discount / gift codes" />

      <div className="p-6 space-y-6">
        {/* ── Create / Edit form ── */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-on-background">
            <Ticket className="h-4 w-4" />
            {editing ? `Edit ${draft.code}` : 'New Coupon'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Code">
              <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10" className={inp} />
            </Field>
            <Field label="Type">
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as 'PERCENT' | 'FIXED' })} className={inp}>
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Flat ₹ off</option>
              </select>
            </Field>
            <Field label={draft.type === 'PERCENT' ? 'Discount %' : 'Amount ₹'}>
              <input type="number" min={0} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} className={inp} />
            </Field>
            <Field label="Min order ₹">
              <input type="number" min={0} value={draft.minOrderAmount} onChange={(e) => setDraft({ ...draft, minOrderAmount: e.target.value })} className={inp} />
            </Field>
            <Field label="Max discount ₹ (cap)">
              <input type="number" min={0} value={draft.maxDiscount} onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })} className={inp} placeholder="optional" />
            </Field>
            <Field label="Total usage limit">
              <input type="number" min={1} value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })} className={inp} />
            </Field>
            <Field label="Per-customer limit (0 = ∞)">
              <input type="number" min={0} value={draft.perCustomerLimit} onChange={(e) => setDraft({ ...draft, perCustomerLimit: e.target.value })} className={inp} />
            </Field>
            <Field label="Starts at">
              <input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} className={inp} />
            </Field>
            <Field label="Expires at">
              <input type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} className={inp} />
            </Field>
            <Field label="Description" className="md:col-span-3">
              <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Internal note shown on the coupon list" className={inp} />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving} className="rounded-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
            </Button>
            {editing && (
              <Button variant="ghost" className="rounded-full" onClick={() => setDraft(EMPTY_DRAFT)}>
                <Plus className="mr-2 h-4 w-4 rotate-45" /> Cancel
              </Button>
            )}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              Active
            </label>
          </div>
        </div>

        {/* ── List ── */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold text-on-background">
            All coupons {loading ? '…' : `(${list.length})`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Discount</th>
                  <th className="px-4 py-2 text-left">Min Order</th>
                  <th className="px-4 py-2 text-left">Used</th>
                  <th className="px-4 py-2 text-left">Per Customer</th>
                  <th className="px-4 py-2 text-left">Window</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-elevated/40">
                    <td className="px-4 py-3 font-mono text-on-background">{c.code}</td>
                    <td className="px-4 py-3 text-on-background">
                      {c.type === 'PERCENT' ? `${c.value}%` : `₹${c.value}`}
                      {c.maxDiscount ? <span className="ml-1 text-[11px] text-muted">(max ₹{c.maxDiscount})</span> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">₹{c.minOrderAmount}</td>
                    <td className="px-4 py-3 text-muted">{c.usageCount} / {c.usageLimit}</td>
                    <td className="px-4 py-3 text-muted">{c.perCustomerLimit === 0 ? '∞' : c.perCustomerLimit}</td>
                    <td className="px-4 py-3 text-muted text-[11px]">
                      {c.startsAt  ? new Date(c.startsAt ).toLocaleDateString() : '—'} →{' '}
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '∞'}
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDraft(toDraft(c))} className="rounded-full px-3 py-1 text-xs text-on-background hover:bg-surface-elevated">Edit</button>
                      <button onClick={() => toggle(c)} className="rounded-full p-1.5 text-muted hover:bg-surface-elevated hover:text-on-background ml-1" title="Toggle active">
                        <Power className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(c)} className="rounded-full p-1.5 text-muted hover:bg-destructive/10 hover:text-destructive ml-1" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && list.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No coupons yet — create one above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

const inp =
  'w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-on-background outline-none focus:border-primary-light'

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  )
}
