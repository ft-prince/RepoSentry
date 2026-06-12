import { NextResponse } from 'next/server'
import { auth, isAuthEnabled } from '@/auth'

/** Gate dashboard routes behind GitHub sign-in when auth is configured. */
export default auth((req) => {
  if (!isAuthEnabled) return NextResponse.next()
  if (req.auth?.user) return NextResponse.next()
  const signinUrl = new URL('/signin', req.nextUrl.origin)
  signinUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(signinUrl)
})

export const config = {
  matcher: ['/overview/:path*', '/reviews/:path*', '/repositories/:path*', '/settings/:path*', '/api/proxy/:path*'],
}
