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
  employeeId:         string
  name:               string
  email:              string
  role:               string
  mustChangePassword: boolean
  departmentId:       string
  department:         string
  sectionId:          string
  section:            string
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
    departmentId:       string
    department:         string
    sectionId:          string
    section:            string
  }
}