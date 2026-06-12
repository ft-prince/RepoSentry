'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1_500)
        } catch {
          // Clipboard unavailable (insecure context) — nothing useful to do.
        }
      }}
      className="inline-flex size-5 items-center justify-center rounded text-faint transition-colors hover:text-foreground"
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? <Check className="size-3 text-success" aria-hidden /> : <Copy className="size-3" aria-hidden />}
    </button>
  )
}
