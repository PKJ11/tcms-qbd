import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { PERMISSIONS } from '@/lib/permissions'
import type { AppRole } from '@/lib/types'

const ROUTE_ROLES: Record<string, readonly AppRole[]> = {
  '/admin':       PERMISSIONS.MANAGE_USERS,
  '/reports':     PERMISSIONS.VIEW_REPORTS,
  '/audit-trail': PERMISSIONS.VIEW_AUDIT_TRAIL,
  '/content':     PERMISSIONS.AUTHOR_CONTENT,
  '/topics':      PERMISSIONS.AUTHOR_CONTENT,
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

    // Route level role check — any of the allowed roles grants access
    const userRoles = (token.roles as AppRole[] | undefined) ?? []

    for (const [route, allowedRoles] of Object.entries(ROUTE_ROLES)) {
      if (pathname.startsWith(route)) {
        const authorised = allowedRoles.some((r) => userRoles.includes(r))
        if (!authorised) {
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
