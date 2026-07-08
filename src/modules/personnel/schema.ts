import { z } from 'zod'

export const createPersonSchema = z.object({
  employeeId: z
    .string()
    .min(1,  'Employee ID is required')
    .max(20, 'Employee ID too long')
    .regex(/^[A-Z0-9\-]+$/i, 'Employee ID can only contain letters, numbers and hyphens'),

  name: z
    .string()
    .min(2,   'Name must be at least 2 characters')
    .max(100, 'Name too long'),

  // Email is now OPTIONAL
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  designation: z
    .string()
    .min(2,   'Designation is required')
    .max(100, 'Designation too long'),

  role: z.enum([
    'USER', 'MANAGER', 'TRAINER',
    'TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER',
  ]),

  unitId:       z.string().min(1, 'Unit is required'),
  departmentId: z.string().optional(),
  managerId:    z.string().optional(),
  joiningDate:  z.string().optional(),
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
    'ADMINISTRATOR',
    'REVIEWER',
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