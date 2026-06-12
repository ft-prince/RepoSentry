'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { useTheme } from 'next-themes'
import {
  LayoutGrid,
  GitPullRequest,
  FolderGit2,
  Settings,
  SunMoon,
  ExternalLink,
} from 'lucide-react'

const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} })

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const run = useCallback((action: () => void) => {
    setIsOpen(false)
    action()
  }, [])

  const context = useMemo(() => ({ open: () => setIsOpen(true) }), [])

  return (
    <CommandPaletteContext.Provider value={context}>
      {children}
      <Command.Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
        label="Command palette"
        className="fixed left-1/2 top-[20%] z-50 w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-2xl animate-fade-in"
      >
        <Command.Input
          placeholder="Type a command or search…"
          className="h-11 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-faint"
        />
        <Command.List className="max-h-72 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-xs text-faint">
            No results.
          </Command.Empty>
          <Command.Group
            heading="Navigate"
            className="text-2xs uppercase tracking-wide text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            <PaletteItem icon={LayoutGrid} onSelect={() => run(() => router.push('/overview'))}>
              Overview
            </PaletteItem>
            <PaletteItem icon={GitPullRequest} onSelect={() => run(() => router.push('/reviews'))}>
              Reviews
            </PaletteItem>
            <PaletteItem icon={FolderGit2} onSelect={() => run(() => router.push('/repositories'))}>
              Repositories
            </PaletteItem>
            <PaletteItem icon={Settings} onSelect={() => run(() => router.push('/settings'))}>
              Settings
            </PaletteItem>
          </Command.Group>
          <Command.Group
            heading="Actions"
            className="text-2xs uppercase tracking-wide text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            <PaletteItem
              icon={SunMoon}
              onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
            >
              Toggle theme
            </PaletteItem>
            <PaletteItem
              icon={ExternalLink}
              onSelect={() =>
                run(() => window.open('https://github.com/ft-prince/RepoSentry', '_blank'))
              }
            >
              Open GitHub repo
            </PaletteItem>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
    </CommandPaletteContext.Provider>
  )
}

function PaletteItem({
  icon: Icon,
  onSelect,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] text-foreground data-[selected=true]:bg-surface-raised"
    >
      <Icon className="size-4 text-faint" />
      {children}
    </Command.Item>
  )
}
