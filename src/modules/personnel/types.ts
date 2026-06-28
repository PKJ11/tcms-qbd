import type { UserRole } from '@/lib/types'

export interface PersonListItem {
  id:           string
  employeeId:   string
  name:         string
  email:        string
  role:         UserRole
  designation:  string
  isActive:     boolean
  joiningDate:  Date
  lastLoginAt:  Date | null
  unit: {
    id:   string
    name: string
  }
  department: {
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
    id:   string
    name: string
    role: UserRole
  }[]
}

export interface CreatePersonInput {
  employeeId:   string
  name:         string
  email:        string
  role:         UserRole
  designation:  string
  joiningDate:  string
  unitId:       string
  departmentId?: string
  managerId?:   string
}

export interface UpdatePersonInput {
  name?:         string
  role?:         UserRole
  designation?:  string
  unitId?:       string
  departmentId?: string
  managerId?:    string
  isActive?:     boolean
}