import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  /** Percentage change vs previous period. Positive = good, negative = bad, undefined = no comparison */
  change?: number
  /** Whether a positive change is good (revenue/orders) or bad (errors/low stock) */
  positiveIsGood?: boolean
  icon?: React.ElementType
  suffix?: string
  prefix?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  change,
  positiveIsGood = true,
  icon: Icon,
  suffix,
  prefix,
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNeutral = change === undefined || change === 0

  const trendColor = isNeutral
    ? 'text-muted'
    : (isPositive && positiveIsGood) || (!isPositive && !positiveIsGood)
    ? 'text-success'
    : 'text-destructive'

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <div className={cn('rounded-lg border border-border bg-surface p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold text-on-background">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
            {suffix && <span className="ml-1 text-sm font-normal text-muted">{suffix}</span>}
          </p>
          {change !== undefined && (
            <div className={cn('mt-1.5 flex items-center gap-1 text-xs', trendColor)}>
              <TrendIcon className="h-3 w-3 shrink-0" />
              <span>
                {Math.abs(change).toFixed(1)}% vs last period
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
