// @ts-nocheck — Recharts components have JSX type incompatibility with React 18 strict mode
'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { SalesDataPoint } from '@/types/admin'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface SalesChartProps {
  data: SalesDataPoint[]
}

// Format ₹ values on the Y axis
function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

// Custom Recharts tooltip styled for dark theme
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 shadow-lg text-xs">
      <p className="mb-1 font-medium text-on-surface">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name === 'revenue' ? formatINR(entry.value) : `${entry.value} orders`}
        </p>
      ))}
    </div>
  )
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-on-background">Sales Overview</h2>
          <p className="text-xs text-muted">Revenue and order volume</p>
        </div>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="both">Both</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5C4033" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#5C4033" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis dataKey="date" tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatINR} tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#5C4033" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="orders">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7A5C4E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7A5C4E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis dataKey="date" tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="orders" name="orders" stroke="#7A5C4E" strokeWidth={2} fill="url(#ordersGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="both">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5C4033" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5C4033" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordersGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4B5AE" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C4B5AE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis dataKey="date" tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="revenue" tickFormatter={formatINR} tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fill: '#8A7B74', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8A7B74' }} />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="#5C4033" strokeWidth={2} fill="url(#revenueGrad2)" dot={false} />
              <Area yAxisId="orders" type="monotone" dataKey="orders" name="orders" stroke="#C4B5AE" strokeWidth={1.5} fill="url(#ordersGrad2)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  )
}
