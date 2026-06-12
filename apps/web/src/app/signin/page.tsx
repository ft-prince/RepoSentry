import { Github } from 'lucide-react'
import { redirect } from 'next/navigation'
import { signIn, isAuthEnabled } from '@/auth'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Sign in' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  if (!isAuthEnabled) redirect('/overview')
  const { callbackUrl } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-6 rounded-lg border border-border bg-surface p-8">
        <Logo />
        <p className="text-center text-xs text-muted">
          Sign in with GitHub to access the RepoSentry dashboard.
        </p>
        <form
          className="w-full"
          action={async () => {
            'use server'
            await signIn('github', { redirectTo: callbackUrl ?? '/overview' })
          }}
        >
          <Button variant="primary" size="lg" type="submit" className="w-full">
            <Github aria-hidden /> Continue with GitHub
          </Button>
        </form>
      </div>
    </main>
  )
}
