import { cn } from '@/lib/utils'

/** Wordmark: a quiet shield glyph + monospace name. No gradients, no emoji. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoGlyph className="size-4 text-accent" />
      <span className="font-mono text-sm font-semibold tracking-tight">reposentry</span>
    </span>
  )
}

export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 1.5 13.5 4v4.2c0 3.1-2.3 5.4-5.5 6.3-3.2-.9-5.5-3.2-5.5-6.3V4L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="m5.5 8 1.8 1.8L10.8 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
