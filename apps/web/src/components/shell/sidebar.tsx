'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, GitPullRequest, FolderGit2, Settings, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

const NAV = [
  { href: '/overview', label: 'Overview', icon: LayoutGrid },
  { href: '/reviews', label: 'Reviews', icon: GitPullRequest },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-52 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-12 items-center border-b border-border px-4">
        <Link href="/overview" className="rounded focus-visible:ring-2">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors duration-100',
                isActive
                  ? 'bg-surface-raised font-medium text-foreground'
                  : 'text-muted hover:bg-surface-raised/60 hover:text-foreground'
              )}
            >
              <Icon className={cn('size-4', isActive ? 'text-accent' : 'text-faint')} aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-2">
        <a
          href="https://github.com/reposentry/reposentry"
          target="_blank"
          rel="noreferrer"
          className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted transition-colors duration-100 hover:bg-surface-raised/60 hover:text-foreground"
        >
          <BookOpen className="size-4 text-faint" aria-hidden />
          Docs & GitHub
        </a>
      </div>
    </aside>
  )
}
