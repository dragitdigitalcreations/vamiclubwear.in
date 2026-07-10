import { NextResponse, type NextRequest } from 'next/server'

// F7 defense-in-depth: redirect unauthenticated visitors away from customer-
// gated routes at the edge, before Next.js renders the page. The real auth
// gate is still the API layer (Bearer JWT verified server-side on every
// data call), so a forged presence cookie grants zero data access — this
// just stops empty auth walls from being served.
//
// The cookie is set client-side by customerAuthStore.setSession() and cleared
// by logout(). We deliberately don't check the JWT itself here because it
// lives in localStorage (out of middleware's reach); moving auth to httpOnly
// cookies is the follow-up (F4-b).

const CUSTOMER_GATED = ['/profile', '/my-orders', '/wishlist', '/checkout']
const SESSION_COOKIE = 'vami-cust-session'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const isGated = CUSTOMER_GATED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (!isGated) return NextResponse.next()

  const hasSession = req.cookies.get(SESSION_COOKIE)?.value === '1'
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
