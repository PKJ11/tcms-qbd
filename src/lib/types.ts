import 'next-auth'
import 'next-auth/jwt'

export type UserRole =
  | 'USER'
  | 'MANAGER'
  | 'TRAINER'
  | 'TRAINING_HEAD'
  | 'SUPER_ADMIN'
  | 'MD'

declare module 'next-auth' {
  interface Session {
    user: {
      id:                 string
      name:               string
      email:              string
      role:               UserRole
      unitId:             string
      unitName:           string
      department:         string | null
      mustChangePassword: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:                 string
    role:               UserRole
    unitId:             string
    unitName:           string
    department:         string | null
    mustChangePassword: boolean
  }
}