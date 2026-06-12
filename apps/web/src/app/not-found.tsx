import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-4">
      <Logo />
      <p className="font-mono text-5xl font-semibold tracking-tight text-faint">404</p>
      <p className="text-sm text-muted">This page doesn&apos;t exist — or the review was deleted.</p>
      <Link href="/overview">
        <Button variant="primary">Back to overview</Button>
      </Link>
    </main>
  )
}
