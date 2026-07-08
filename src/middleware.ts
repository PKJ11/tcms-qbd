import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/types'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER:          1,
  MANAGER:       2,
  TRAINER:       3,
  TRAINING_HEAD: 4,
  ADMINISTRATOR: 5,
  REVIEWER:      6,
}

const ROUTE_MIN_ROLES: Record<string, UserRole> = {
  '/admin':       'ADMINISTRATOR',
  '/reports':     'MANAGER',
  '/audit-trail': 'TRAINING_HEAD',
  '/content':     'TRAINING_HEAD',
  '/topics':      'TRAINING_HEAD',
}

export default withAuth(
  function middleware(req) {
    const token    = req.nextauth.token
    const pathname = req.nextUrl.pathname

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Force password change — redirect everywhere except change-password
    if (
      token.mustChangePassword &&
      !pathname.startsWith('/change-password') &&
      !pathname.startsWith('/api')
    ) {
      return NextResponse.redirect(new URL('/change-password', req.url))
    }

    // Route level role check
    for (const [route, minRole] of Object.entries(ROUTE_MIN_ROLES)) {
      if (pathname.startsWith(route)) {
        const userLevel = ROLE_HIERARCHY[token.role as UserRole] ?? 0
        const minLevel  = ROLE_HIERARCHY[minRole]
        if (userLevel < minLevel) {
          return NextResponse.redirect(new URL('/unauthorised', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|login|forgot-password|change-password|_next/static|_next/image|favicon.ico).*)',
  ],
}