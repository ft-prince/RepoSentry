'use client'

import { usePathname } from 'next/navigation'
import { Command } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { useCommandPalette } from './command-palette'

const TITLES: [string, string][] = [
  ['/overview', 'Overview'],
  ['/reviews/', 'Review detail'],
  ['/reviews', 'Reviews'],
  ['/repositories', 'Repositories'],
  ['/settings', 'Settings'],
]

export function Topbar() {
  const pathname = usePathname()
  const { open } = useCommandPalette()
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'RepoSentry'

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:pl-6">
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="flex items-center gap-1.5">
        <button
          onClick={open}
          className="hidden h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs text-faint transition-colors hover:border-border-strong hover:text-muted sm:flex"
          aria-label="Open command palette"
        >
          <Command className="size-3" aria-hidden />K
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
