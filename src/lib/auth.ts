import { NextAuthOptions, getServerSession, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/types'
import { logAuthEvent } from '@/modules/audit-trail'

interface TCMSUser extends User {
  id:                 string
  role:               UserRole
  unitId:             string
  unitName:           string
  department:         string | null
  mustChangePassword: boolean
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.person.findUnique({
          where:   { email: credentials.email },
          include: { unit: true, department: true },
        })

        if (!user || !user.passwordHash) return null
        if (!user.isActive) return null

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )
        if (!valid) return null

        // Update last login timestamp
        await prisma.person.update({
          where: { id: user.id },
          data:  { lastLoginAt: new Date() },
        })

        return {
          id:                 user.id,
          name:               user.name,
          email:              user.email,
          role:               user.role,
          unitId:             user.unitId,
          unitName:           user.unit.name,
          department:         user.department?.name ?? null,
          mustChangePassword: user.mustChangePassword,
        } as TCMSUser
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u                  = user as TCMSUser
        token.id                 = u.id
        token.role               = u.role
        token.unitId             = u.unitId
        token.unitName           = u.unitName
        token.department         = u.department
        token.mustChangePassword = u.mustChangePassword
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id                 = token.id         as string
        session.user.role               = token.role        as UserRole
        session.user.unitId             = token.unitId      as string
        session.user.unitName           = token.unitName    as string
        session.user.department         = token.department  as string | null
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    },
  },

  // ── Events — fire after NextAuth actions complete ──────────────────
  events: {
    async signIn({ user }) {
      try {
        await logAuthEvent({
          userId: user.id,
          action: 'LOGIN',
        })
      } catch (error) {
        // Never block login because of audit failure
        console.error('[AUTH EVENT - signIn audit failed]', error)
      }
    },

    async signOut({ token }) {
      try {
        if (token?.id) {
          await logAuthEvent({
            userId: token.id as string,
            action: 'LOGOUT',
          })
        }
      } catch (error) {
        console.error('[AUTH EVENT - signOut audit failed]', error)
      }
    },
  },
}

export const getSession = () => getServerSession(authOptions)