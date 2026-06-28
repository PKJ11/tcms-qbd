import { z } from 'zod'

export const createPersonSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .max(20, 'Employee ID too long')
    .regex(/^[A-Z0-9\-]+$/, 'Employee ID must be uppercase letters, numbers, or hyphens'),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),

  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email too long'),

  role: z.enum([
    'USER',
    'MANAGER',
    'TRAINER',
    'TRAINING_HEAD',
    'SUPER_ADMIN',
    'MD',
  ]),

  designation: z
    .string()
    .min(2, 'Designation is required')
    .max(100, 'Designation too long'),

  joiningDate: z
    .string()
    .min(1, 'Joining date is required'),

  unitId: z
    .string()
    .min(1, 'Unit is required'),

  departmentId: z
    .string()
    .optional(),

  managerId: z
    .string()
    .optional(),
})

export const updatePersonSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .optional(),

  role: z.enum([
    'USER',
    'MANAGER',
    'TRAINER',
    'TRAINING_HEAD',
    'SUPER_ADMIN',
    'MD',
  ]).optional(),

  designation: z
    .string()
    .min(2)
    .max(100)
    .optional(),

  unitId: z
    .string()
    .optional(),

  departmentId: z
    .string()
    .optional(),

  managerId: z
    .string()
    .optional(),

  isActive: z
    .boolean()
    .optional(),
})

export const deactivatePersonSchema = z.object({
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters')
    .max(500, 'Justification too long'),
})