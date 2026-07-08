import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider                from 'next-auth/providers/credentials'
import { prisma }                         from '@/lib/prisma'
import bcrypt                             from 'bcryptjs'
import type { TCMSUser }                  from '@/lib/types'

export const authOptions: NextAuthOptions = {
  session:  { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages:    { signIn: '/login' },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        // Changed from email to employeeId
        employeeId: { label: 'Employee ID', type: 'text'     },
        password:   { label: 'Password',    type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) {
          return null
        }

        // Look up by employeeId — NOT email
        const person = await prisma.person.findUnique({
          where:  { employeeId: credentials.employeeId.trim().toUpperCase() },
          select: {
            id:                 true,
            employeeId:         true,
            name:               true,
            email:              true,  // still select it — used for display
            role:               true,
            passwordHash:       true,
            mustChangePassword: true,
            isActive:           true,
            unitId:             true,
            departmentId:       true,
            unit:               { select: { name: true } },
            department:         { select: { name: true } },
          },
        })

        // Person not found
        if (!person) return null

        // Account deactivated
        if (!person.isActive) return null

        // No password set
        if (!person.passwordHash) return null

        // Verify password
        const valid = await bcrypt.compare(
          credentials.password,
          person.passwordHash
        )
        if (!valid) return null

        // Return user object — used in JWT callback
        const user: TCMSUser = {
          id:                 person.id,
          employeeId:         person.employeeId,
          name:               person.name,
          email:              person.email ?? '',  // empty string if no email
          role:               person.role,
          mustChangePassword: person.mustChangePassword,
          unitId:             person.unitId ?? '',
          unitName:           person.unit?.name ?? '',
          department:         person.department?.name ?? '',
        }

        return user
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as TCMSUser
        token.id                 = u.id
        token.employeeId         = u.employeeId
        token.name               = u.name
        token.email              = u.email
        token.role               = u.role
        token.mustChangePassword = u.mustChangePassword
        token.unitId             = u.unitId
        token.unitName           = u.unitName
        token.department         = u.department
      }
      return token
    },

    async session({ session, token }) {
      session.user = {
        id:                 token.id                 as string,
        employeeId:         token.employeeId         as string,
        name:               token.name               as string,
        email:              token.email              as string,
        role:               token.role               as string,
        mustChangePassword: token.mustChangePassword as boolean,
        unitId:             token.unitId             as string,
        unitName:           token.unitName           as string,
        department:         token.department         as string,
      }
      return session
    },
  },

  events: {
    async signIn({ user }) {
      // Audit log on successful login
      try {
        const u = user as TCMSUser
        await prisma.auditLog.create({
          data: {
            userId:     u.id,
            action:     'LOGIN',
            module:     'AUTH',
            recordId:   u.id,
            recordType: 'Person',
            justification: 'System-generated: user login',
            afterValue: {
              employeeId: u.employeeId,
              role:       u.role,
              timestamp:  new Date().toISOString(),
            },
          },
        })
      } catch {
        // Never block login due to audit log failure
      }
    },
  },
}

export default NextAuth(authOptions)

// ── Server-side session helper ────────────────────────────────────

import { getServerSession } from 'next-auth'

export async function getSession() {
  return getServerSession(authOptions)
}