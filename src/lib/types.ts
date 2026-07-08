import type { DefaultSession } from 'next-auth'

export type UserRole =
  | 'USER'
  | 'MANAGER'
  | 'TRAINER'
  | 'TRAINING_HEAD'
  | 'ADMINISTRATOR'
  | 'REVIEWER'

export interface TCMSUser {
  id:                 string
  employeeId:         string   // ← primary auth identifier
  name:               string
  email:              string   // still in session but may be empty string
  role:               string
  mustChangePassword: boolean
  unitId:             string
  unitName:           string
  department:         string
}

declare module 'next-auth' {
  interface Session {
    user: TCMSUser
  }
  interface User extends TCMSUser {}
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:                 string
    employeeId:         string
    name:               string
    email:              string
    role:               string
    mustChangePassword: boolean
    unitId:             string
    unitName:           string
    department:         string
  }
}