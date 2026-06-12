'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Metrics, Severity } from '@/lib/types'
import { SEVERITIES } from '@/lib/types'

/** Minimal, axis-light charts: monochrome + the single accent. */

const tooltipStyle = {
  background: 'hsl(var(--surface-raised))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
}

export function ReviewsOverTimeChart({ data }: { data: Metrics['reviewsOverTime'] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
        <defs>
          <linearGradient id="reviewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 10, fill: 'hsl(var(--faint))' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={48}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--faint))' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(var(--border-strong))' }} />
        <Area
          type="monotone"
          dataKey="count"
          name="Reviews"
          stroke="hsl(var(--accent))"
          strokeWidth={1.5}
          fill="url(#reviewsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const SEVERITY_FILL: Record<Severity, string> = {
  critical: 'hsl(var(--severity-critical))',
  high: 'hsl(var(--severity-high))',
  medium: 'hsl(var(--severity-medium))',
  low: 'hsl(var(--severity-low))',
}

export function SeverityDistributionChart({
  distribution,
}: {
  distribution: Metrics['severityDistribution']
}) {
  const data = SEVERITIES.map((severity) => ({
    severity,
    count: distribution[severity] ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
        <XAxis
          dataKey="severity"
          tick={{ fontSize: 10, fill: 'hsl(var(--faint))' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--faint))' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--surface-raised))' }} />
        <Bar dataKey="count" name="Findings" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.severity} fill={SEVERITY_FILL[entry.severity]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
