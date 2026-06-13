import { useCallback, useEffect, useState } from 'react'

export interface SavedView {
  id: string
  name: string
  /** Serialized URL query string for the Reviews page, e.g. "risk=critical&status=completed". */
  query: string
}

const STORAGE_KEY = 'reposentry:saved-views'

function read(): SavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SavedView[]) : []
  } catch {
    return []
  }
}

/** Named, persisted Reviews filter presets ("saved views"). */
export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([])

  useEffect(() => {
    setViews(read())
  }, [])

  const persist = useCallback((next: SavedView[]) => {
    setViews(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage unavailable (private mode / quota) — keep in-memory only.
    }
  }, [])

  const addView = useCallback(
    (name: string, query: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      // Stable, collision-resistant id without Math.random at module scope.
      const id = `${Date.now().toString(36)}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`
      persist([...read().filter((v) => v.name !== trimmed), { id, name: trimmed, query }])
    },
    [persist]
  )

  const removeView = useCallback(
    (id: string) => {
      persist(read().filter((v) => v.id !== id))
    },
    [persist]
  )

  return { views, addView, removeView }
}
