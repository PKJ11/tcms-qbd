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
    // Contractual employees may only ever be Trainees — no Trainer access.
    roles: z
      .array(z.enum(['TRAINEE']))
      .min(1, 'Contractual employees can only be assigned the Trainee role'),
    ...commonFields,
  }),
])

export const updatePersonSchema = z.object({
  id:           z.string().min(1),
  name:         z.string().min(2).max(100).optional(),
  email:        z.string().email('Invalid email address').nullable().optional(),
  designation:  z.string().min(2).max(100).optional(),
  joiningDate:  z.string().nullable().optional(),
  roles:        z.array(z.enum([
    'ADMINISTRATOR', 'VIEWER', 'TRAINER',
    'TRAINEE', 'GUEST_TRAINER', 'CONTRACTUAL_EMPLOYEE',
  ])).optional(),
  departmentId: z.string().optional(),
  unitId:       z.string().optional(),
  sectionId:    z.string().nullable().optional(),
  managerId:    z.string().nullable().optional(),
  isActive:     z.boolean().optional(),
}).refine(
  (data) =>
    !data.roles ||
    !data.roles.includes('CONTRACTUAL_EMPLOYEE') ||
    data.roles.every((r) => r === 'CONTRACTUAL_EMPLOYEE' || r === 'TRAINEE'),
  { message: 'Contractual employees can only be assigned the Trainee role', path: ['roles'] }
)

export { REGULAR_EMPLOYEE_ID, CONTRACTUAL_EMPLOYEE_ID }
