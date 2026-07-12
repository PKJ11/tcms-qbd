import { z } from 'zod'

const REGULAR_EMPLOYEE_ID     = /^\d+$/
const CONTRACTUAL_EMPLOYEE_ID = /^CR-\d{3}$/

const commonFields = {
  name: z
    .string()
    .min(2,   'Name must be at least 2 characters')
    .max(100, 'Name too long'),

  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  designation: z
    .string()
    .min(2,   'Designation is required')
    .max(100, 'Designation too long'),

  joiningDate: z.string().optional(),

  departmentId: z.string().min(1, 'Department is required'),
  unitId:       z.string().min(1, 'Unit is required'),
  sectionId:    z.string().optional(),
  managerId:    z.string().optional(),
}

export const createPersonSchema = z.discriminatedUnion('employeeType', [
  z.object({
    employeeType: z.literal('QBD'),
    employeeId:   z.string().regex(REGULAR_EMPLOYEE_ID, 'Employee ID must be numeric'),
    roles: z
      .array(z.enum(['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'TRAINEE']))
      .min(1, 'Select at least one role'),
    ...commonFields,
  }),
  z.object({
    employeeType: z.literal('GUEST'),
    ...commonFields,
  }),
  z.object({
    employeeType: z.literal('CONTRACTUAL'),
    roles: z
      .array(z.enum(['TRAINER', 'TRAINEE']))
      .min(1, 'Select Trainer, Trainee, or both'),
    ...commonFields,
  }),
])

export const updatePersonSchema = z.object({
  id:           z.string().min(1),
  name:         z.string().min(2).max(100).optional(),
  designation:  z.string().min(2).max(100).optional(),
  roles:        z.array(z.enum([
    'ADMINISTRATOR', 'VIEWER', 'TRAINER',
    'TRAINEE', 'GUEST_TRAINER', 'CONTRACTUAL_EMPLOYEE',
  ])).optional(),
  departmentId: z.string().optional(),
  unitId:       z.string().optional(),
  sectionId:    z.string().optional(),
  managerId:    z.string().optional(),
  isActive:     z.boolean().optional(),
})

export { REGULAR_EMPLOYEE_ID, CONTRACTUAL_EMPLOYEE_ID }
