import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(raw) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:')
    return NextResponse.json({ error: 'HTTPS only' }, { status: 400 })

  const h = parsed.hostname
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|0\.0\.0\.0)/.test(h))
    return NextResponse.json({ error: 'Private hosts not allowed' }, { status: 400 })

  try {
    const res = await fetch(raw, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 })

    const contentType = res.headers.get('content-type') || ''
    if (!ALLOWED_TYPES.some(t => contentType.startsWith(t)))
      return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 })

    const contentLength = Number(res.headers.get('content-length') || 0)
    if (contentLength > MAX_SIZE)
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const blob = await res.blob()
    if (blob.size > MAX_SIZE)
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
