import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm placeholder:text-faint hover:border-border-strong focus:border-accent',
        className
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-8 rounded-md border border-border bg-surface px-2 text-sm text-foreground hover:border-border-strong focus:border-accent',
        className
      )}
      {...props}
    />
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-5 w-9 rounded-full border border-border transition-colors duration-150',
        checked ? 'bg-accent' : 'bg-surface-raised'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-3.5 rounded-full bg-foreground transition-transform duration-150',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          checked && 'bg-accent-foreground'
        )}
      />
    </button>
  )
}
