import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose/jwt/verify'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-in-production-please-use-env'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow auth endpoints and the login page
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value

  if (token) {
    try {
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch {
      // Token invalid or expired — fall through to redirect/401
    }
  }

  // API routes: return 401 so client-side fetches can handle it
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Page routes: redirect to login
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
