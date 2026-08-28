import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider                from 'next-auth/providers/credentials'
import { prisma }                         from '@/lib/prisma'
import bcrypt                             from 'bcryptjs'
import type { TCMSUser }                  from '@/lib/types'
import { getPasswordPolicy }              from '@/lib/password-policy'

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
}

// Absolute token lifetime is now short — the real session length is governed
// by the client-side idle-timeout flow (see useIdleSessionTimeout), which
// keeps the token alive via update() calls while the user is active and lets
// it expire on its own as a hard backstop if that client logic never runs
// (JS disabled, frozen tab, etc). updateAge is low so any session touch
// (navigation, update() call) re-issues the cookie with a fresh expiry.
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 4 * 60, updateAge: 60 },
  pages:   { signIn: '/login' },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        employeeId: { label: 'Employee ID', type: 'text'     },
        password:   { label: 'Password',    type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) return null

        const person = await prisma.person.findUnique({
          where:  { employeeId: credentials.employeeId.trim().toUpperCase() },
          select: {
            id:                  true,
            employeeId:          true,
            name:                true,
            email:               true,
            passwordHash:        true,
            mustChangePassword:  true,
            passwordChangedAt:   true,
            failedLoginAttempts: true,
            isLocked:            true,
            isActive:            true,
            departmentId:        true,
            unitId:              true,
            sectionId:           true,
            department:          { select: { id: true, name: true, code: true } },
            unit:                { select: { id: true, name: true } },
            section:             { select: { id: true, name: true } },
            roles:               { select: { role: true } },
          },
        })

        if (!person)           return null
        if (!person.isActive)  return null
        if (!person.passwordHash) return null

        // Admin-configurable password policy (falls back to defaults if unset)
        const policy = await getPasswordPolicy()
        const MAX_FAILED_LOGIN_ATTEMPTS = policy.failedAttemptLimit
        const PASSWORD_EXPIRY_DAYS      = policy.passwordExpiryDays
        const policyEnforced           = policy.authMode !== 'LDAP'

        // Account locked — only an Administrator can unlock it. Block the
        // attempt regardless of whether the password entered is correct.
        if (person.isLocked) {
          throw new Error(
            'Your account has been locked after multiple failed login attempts. Please contact your Administrator to unlock it.'
          )
        }

        const valid = await bcrypt.compare(credentials.password, person.passwordHash)

        if (!valid) {
          const attempts = person.failedLoginAttempts + 1

          if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            await prisma.person.update({
              where: { id: person.id },
              data:  { failedLoginAttempts: attempts, isLocked: true, lockedAt: new Date() },
            })
            await prisma.auditLog.create({
              data: {
                userId:        person.id,
                action:        'UPDATE',
                module:        'AUTH',
                recordId:      person.id,
                recordType:    'Person',
                justification: `Account auto-locked after ${MAX_FAILED_LOGIN_ATTEMPTS} consecutive failed login attempts`,
                afterValue:    { isLocked: true, failedLoginAttempts: attempts },
              },
            }).catch(() => {})
            throw new Error(
              `Your account has been locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts. Please contact your Administrator to unlock it.`
            )
          }

          await prisma.person.update({
            where: { id: person.id },
            data:  { failedLoginAttempts: attempts },
          })
          throw new Error(
            `Invalid Employee ID or password. ${MAX_FAILED_LOGIN_ATTEMPTS - attempts} attempt(s) remaining before your account is locked.`
          )
        }

        // Successful login — clear any prior failed-attempt count
        if (person.failedLoginAttempts > 0) {
          await prisma.person.update({
            where: { id: person.id },
            data:  { failedLoginAttempts: 0 },
          })
        }

        // Password expiry — force a change after the configured number of
        // days, regardless of the mustChangePassword flag set at creation/
        // reset time. Skipped entirely when Auth Mode is LDAP.
        const passwordAgeDays       = daysSince(person.passwordChangedAt)
        const passwordExpired       = policyEnforced && passwordAgeDays >= PASSWORD_EXPIRY_DAYS
        const mustChangePassword    = person.mustChangePassword || passwordExpired
        const passwordDaysRemaining = PASSWORD_EXPIRY_DAYS - passwordAgeDays

        if (passwordExpired && !person.mustChangePassword) {
          await prisma.person.update({
            where: { id: person.id },
            data:  { mustChangePassword: true },
          })
        }

        const user: TCMSUser = {
          id:                    person.id,
          employeeId:            person.employeeId,
          name:                  person.name,
          email:                 person.email ?? '',
          roles:                 person.roles.map((r) => r.role),
          mustChangePassword,
          passwordDaysRemaining,
          departmentId:          person.departmentId,
          department:            person.department?.name ?? '',
          departmentCode:        person.department?.code ?? '',
          unitId:                person.unitId,
          unit:                  person.unit?.name ?? '',
          sectionId:             person.sectionId ?? '',
          section:               person.section?.name ?? '',
        }

        return user
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as TCMSUser
        token.id                    = u.id
        token.employeeId            = u.employeeId
        token.name                  = u.name
        token.email                 = u.email
        token.roles                 = u.roles
        token.mustChangePassword    = u.mustChangePassword
        token.passwordDaysRemaining = u.passwordDaysRemaining
        token.departmentId          = u.departmentId
        token.department            = u.department
        token.departmentCode        = u.departmentCode
        token.unitId                = u.unitId
        token.unit                  = u.unit
        token.sectionId             = u.sectionId
        token.section               = u.section
      }
      return token
    },

    async session({ session, token }) {
      session.user = {
        id:                    token.id                    as string,
        employeeId:            token.employeeId            as string,
        name:                  token.name                  as string,
        email:                 token.email                 as string,
        roles:                 token.roles,
        mustChangePassword:    token.mustChangePassword    as boolean,
        passwordDaysRemaining: token.passwordDaysRemaining as number,
        departmentId:          token.departmentId          as string,
        department:            token.department            as string,
        departmentCode:        token.departmentCode        as string,
        unitId:                token.unitId                as string,
        unit:                  token.unit                  as string,
        sectionId:             token.sectionId             as string,
        section:               token.section               as string,
      }
      return session
    },
  },

  events: {
    async signIn({ user }) {
      try {
        const u = user as TCMSUser
        await prisma.auditLog.create({
          data: {
            userId:        u.id,
            action:        'LOGIN',
            module:        'AUTH',
            recordId:      u.id,
            recordType:    'Person',
            justification: 'User login',
            afterValue:    {
              employeeId: u.employeeId,
              roles:      u.roles,
              timestamp:  new Date().toISOString(),
            },
          },
        })
      } catch {
        // Never block login
      }
    },
  },
}

export default NextAuth(authOptions)

import { getServerSession } from 'next-auth'
export async function getSession() {
  return getServerSession(authOptions)
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const person = await prisma.person.findUnique({
    where:  { id: userId },
    select: { passwordHash: true },
  })
  if (!person?.passwordHash) return false
  return bcrypt.compare(password, person.passwordHash)
}