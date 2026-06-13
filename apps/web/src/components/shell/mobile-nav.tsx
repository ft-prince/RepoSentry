'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { NAV_ITEMS } from './nav-items'

/** Hamburger + slide-in drawer for screens narrower than the fixed sidebar. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  useEffect(() => setMounted(true), [])
  // Close on route change and lock body scroll while open.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Portal to <body> so the overlay escapes the topbar's backdrop-blur
  // stacking/compositing context (otherwise the drawer renders see-through).
  const overlay = (
    <AnimatePresence>
      {open && (
        <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface"
              initial={reduceMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: '-100%' }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              role="dialog"
              aria-label="Navigation"
            >
              <div className="flex h-12 items-center justify-between border-b border-border px-4">
                <Logo />
                <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                  <X aria-hidden />
                </Button>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
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
            </motion.aside>
          </>
      )}
    </AnimatePresence>
  )

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Menu aria-hidden />
      </Button>
      {mounted && createPortal(overlay, document.body)}
    </div>
  )
}
