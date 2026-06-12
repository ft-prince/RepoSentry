import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'RepoSentry', template: '%s · RepoSentry' },
  description:
    'Open-source AI pull-request reviewer. Automated first-pass reviews with inline comments — GitHub App + MCP server, self-hosted for free.',
  openGraph: {
    title: 'RepoSentry — AI pull-request reviewer',
    description:
      'Automated first-pass code review: bugs, security smells, and style issues as inline PR comments. Open source, $0 to run.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      style={{ ['--font-sans' as string]: GeistSans.style.fontFamily, ['--font-mono' as string]: GeistMono.style.fontFamily }}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans text-sm">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
