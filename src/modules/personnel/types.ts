import type { AppRole } from '@/lib/types'

export interface PersonListItem {
  id:           string
  employeeId:   string
  name:         string
  email:        string | null
  roles:        AppRole[]
  designation:  string
  isActive:     boolean
  joiningDate:  Date
  lastLoginAt:  Date | null
  department: {
    id:   string
    name: string
  } | null
  unit: {
    id:   string
    name: string
  } | null
  section: {
    id:   string
    name: string
  } | null
  manager: {
    id:   string
    name: string
  } | null
}

export interface PersonDetail extends PersonListItem {
  mustChangePassword: boolean
  createdAt:          Date
  updatedAt:          Date
  subordinates: {
    id:    string
    name:  string
    roles: AppRole[]
  }[]
}

export type EmployeeType = 'QBD' | 'GUEST' | 'CONTRACTUAL'

export interface CreatePersonInput {
  employeeType: EmployeeType
  employeeId?:  string   // required for QBD only — GUEST/CONTRACTUAL are server-generated
  name:         string
  email?:       string
  roles?:       AppRole[]  // QBD: any of Administrator/Viewer/Trainer/Trainee; CONTRACTUAL: Trainer/Trainee; GUEST: ignored (forced to Guest Trainer)
  designation:  string
  joiningDate?: string
  departmentId: string
  unitId:       string
  sectionId?:   string
  managerId?:   string
}

export interface UpdatePersonInput {
  name?:         string
  roles?:        AppRole[]
  designation?:  string
  departmentId?: string
  unitId?:       string
  sectionId?:    string
  managerId?:    string
  isActive?:     boolean
}
