'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoHint } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const COUNT_UP_MS = 600

/** KPI with a fast count-up. Strings render as-is (e.g. "32s"). */
export function KpiCard({
  label,
  value,
  hint,
  tone,
  info,
}: {
  label: string
  value: number | string
  hint?: string
  tone?: 'danger'
  /** Optional help text shown via a "?" hint next to the label. */
  info?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {label}
          {info && <InfoHint content={info} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1.5">
        <div
          className={cn(
            'tnum font-mono text-2xl font-semibold tracking-tight',
            tone === 'danger' && typeof value === 'number' && value > 0 && 'text-severity-critical'
          )}
        >
          {typeof value === 'number' ? <CountUp target={value} /> : value}
        </div>
        {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function CountUp({ target }: { target: number }) {
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? target : 0)
  const frame = useRef<number>(0)

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(Math.round(target * eased * 10) / 10)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, reduceMotion])

  return <>{Number.isInteger(target) ? Math.round(display) : display.toFixed(1)}</>
}
