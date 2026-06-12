import { NextResponse, type NextRequest } from 'next/server'

/**
 * Thin authenticated proxy so client components can call the API without the
 * internal bearer token ever reaching the browser. Auth-gated via middleware.
 */
const ALLOWED_PREFIXES = ['reviews', 'repos', 'metrics', 'settings']

async function forward(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  if (!path[0] || !ALLOWED_PREFIXES.includes(path[0])) {
    return NextResponse.json({ success: false, data: null, error: 'not found' }, { status: 404 })
  }
  const token = process.env.API_INTERNAL_TOKEN
  if (!token) {
    return NextResponse.json(
      { success: false, data: null, error: 'API_INTERNAL_TOKEN not configured' },
      { status: 500 }
    )
  }
  const base = process.env.API_URL ?? 'http://localhost:3001'
  const target = `${base}/api/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`

  try {
    const res = await fetch(target, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
      cache: 'no-store',
    })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: 'API unreachable — is apps/api running?' },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params)
}
