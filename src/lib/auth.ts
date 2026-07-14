import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider                from 'next-auth/providers/credentials'
import { prisma }                         from '@/lib/prisma'
import bcrypt                             from 'bcryptjs'
import type { TCMSUser }                  from '@/lib/types'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
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
            id:                 true,
            employeeId:         true,
            name:               true,
            email:              true,
            passwordHash:       true,
            mustChangePassword: true,
            isActive:           true,
            departmentId:       true,
            unitId:             true,
            sectionId:          true,
            department:         { select: { id: true, name: true, code: true } },
            unit:               { select: { id: true, name: true } },
            section:            { select: { id: true, name: true } },
            roles:              { select: { role: true } },
          },
        })

        if (!person)           return null
        if (!person.isActive)  return null
        if (!person.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, person.passwordHash)
        if (!valid) return null

        const user: TCMSUser = {
          id:                 person.id,
          employeeId:         person.employeeId,
          name:               person.name,
          email:              person.email ?? '',
          roles:              person.roles.map((r) => r.role),
          mustChangePassword: person.mustChangePassword,
          departmentId:       person.departmentId,
          department:         person.department?.name ?? '',
          departmentCode:     person.department?.code ?? '',
          unitId:             person.unitId,
          unit:               person.unit?.name ?? '',
          sectionId:          person.sectionId ?? '',
          section:            person.section?.name ?? '',
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
        token.roles              = u.roles
        token.mustChangePassword = u.mustChangePassword
        token.departmentId       = u.departmentId
        token.department         = u.department
        token.departmentCode     = u.departmentCode
        token.unitId             = u.unitId
        token.unit               = u.unit
        token.sectionId          = u.sectionId
        token.section            = u.section
      }
      return token
    },

    async session({ session, token }) {
      session.user = {
        id:                 token.id                 as string,
        employeeId:         token.employeeId         as string,
        name:               token.name               as string,
        email:              token.email              as string,
        roles:              token.roles,
        mustChangePassword: token.mustChangePassword as boolean,
        departmentId:       token.departmentId       as string,
        department:         token.department         as string,
        departmentCode:     token.departmentCode     as string,
        unitId:             token.unitId             as string,
        unit:               token.unit               as string,
        sectionId:          token.sectionId          as string,
        section:            token.section            as string,
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