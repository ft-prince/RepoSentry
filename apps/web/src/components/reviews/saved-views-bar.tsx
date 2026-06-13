'use client'

import { useState } from 'react'
import { Bookmark, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSavedViews } from '@/lib/use-saved-views'
import { cn } from '@/lib/utils'

/**
 * Saved views = named filter presets persisted in localStorage. "Save current
 * view" captures the current URL query; clicking a chip re-applies it.
 */
export function SavedViewsBar({
  currentQuery,
  onApply,
}: {
  currentQuery: string
  onApply: (query: string) => void
}) {
  const { views, addView, removeView } = useSavedViews()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  const canSave = currentQuery.length > 0 && !views.some((v) => v.query === currentQuery)

  const save = () => {
    addView(name, currentQuery)
    setName('')
    setNaming(false)
  }

  if (views.length === 0 && !canSave && !naming) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-2xs text-faint">
        <Bookmark className="size-3" aria-hidden /> Views
      </span>

      {views.map((view) => {
        const isActive = view.query === currentQuery
        return (
          <span
            key={view.id}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs transition-colors',
              isActive
                ? 'border-accent/40 bg-accent-subtle text-accent'
                : 'border-border text-muted hover:border-border-strong hover:text-foreground'
            )}
          >
            <button onClick={() => onApply(view.query)}>{view.name}</button>
            <button
              onClick={() => removeView(view.id)}
              aria-label={`Delete view ${view.name}`}
              className="text-faint hover:text-danger"
            >
              <X className="size-2.5" aria-hidden />
            </button>
          </span>
        )
      })}

      {naming ? (
        <span className="inline-flex items-center gap-1">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setNaming(false)
            }}
            placeholder="View name"
            className="h-6 w-32 text-xs"
            aria-label="Name for saved view"
          />
          <Button size="sm" variant="primary" onClick={save} disabled={!name.trim()}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>
            Cancel
          </Button>
        </span>
      ) : (
        canSave && (
          <button
            onClick={() => setNaming(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-2xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Plus className="size-2.5" aria-hidden /> Save current view
          </button>
        )
      )}
    </div>
  )
}
