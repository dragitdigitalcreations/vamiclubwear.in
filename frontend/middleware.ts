import { NextResponse, type NextRequest } from 'next/server'

// F7 + F4b: redirect signed-out visitors away from customer-gated routes at
// the edge, before Next.js renders the page. Post-F4b the session token is
// an httpOnly cookie set by the backend (readable by this Node/Edge
// middleware but NOT by browser JS), so a forged cookie can't grant access
// — the backend re-verifies the JWT signature on every data call.
//
// Middleware only checks for cookie presence, not signature. If the cookie
// is present but expired/tampered, the first API call returns 401 and the
// storefront's api.request() handler drops the client-side user cache.

const CUSTOMER_GATED = ['/profile', '/my-orders', '/wishlist', '/checkout']
// Must match backend/src/middleware/customerAuth.ts CUSTOMER_COOKIE
const SESSION_COOKIE = 'vami_customer'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const isGated = CUSTOMER_GATED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (!isGated) return NextResponse.next()

  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value
  if (hasSession) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/'
  // Preserve the intended destination so the login modal can bounce the
  // user back after successful sign-in. Cart contents survive in Zustand
  // localStorage regardless.
  url.searchParams.set('signin', pathname === '/checkout' ? 'checkout' : 'required')
  url.searchParams.set('next', pathname + (search ?? ''))
  return NextResponse.redirect(url)
}

export const config = {
  // Skip static assets, image optimiser, and API routes — those have their
  // own auth. Only match human-facing document routes.
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\..*).*)'],
}
