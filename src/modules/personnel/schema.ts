import { z } from 'zod'

export const createPersonSchema = z.object({
  employeeId: z
    .string()
    .min(1,  'Employee ID is required')
    .max(20, 'Employee ID too long'),

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

  role: z.enum([
    'USER', 'MANAGER', 'TRAINER',
    'TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER',
  ]),

  departmentId: z.string().min(1, 'Department is required'),
  sectionId:    z.string().optional(),   // optional
  managerId:    z.string().optional(),
  joiningDate:  z.string().optional(),
})

export const updatePersonSchema = createPersonSchema.partial().extend({
  id: z.string().min(1),
})