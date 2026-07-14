import type { DefaultSession } from 'next-auth'
import type { AppRole } from '@prisma/client'

export type { AppRole }

export interface TCMSUser {
  id:                 string
  employeeId:         string
  name:               string
  email:              string
  roles:              AppRole[]
  mustChangePassword: boolean
  departmentId:       string
  department:         string
  departmentCode:     string
  unitId:             string
  unit:               string
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
    roles:              AppRole[]
    mustChangePassword: boolean
    departmentId:       string
    department:         string
    departmentCode:     string
    unitId:             string
    unit:               string
    sectionId:          string
    section:            string
  }
}
