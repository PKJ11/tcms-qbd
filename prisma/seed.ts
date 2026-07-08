import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Units ───────────────────────────────────
  const unit1 = await prisma.unit.upsert({
    where:  { code: 'U1' },
    update: {},
    create: { name: 'Unit 1', code: 'U1' },
  })

  const unit2 = await prisma.unit.upsert({
    where:  { code: 'U2' },
    update: {},
    create: { name: 'Unit 2', code: 'U2' },
  })

  console.log('✅ Units created')

  // ─── Departments ─────────────────────────────
  const deptQC = await prisma.department.upsert({
    where:  { unitId_code: { unitId: unit1.id, code: 'QC' } },
    update: {},
    create: { name: 'Quality Control', code: 'QC', unitId: unit1.id },
  })

  const deptRD = await prisma.department.upsert({
    where:  { unitId_code: { unitId: unit1.id, code: 'RD' } },
    update: {},
    create: { name: 'Research & Development', code: 'RD', unitId: unit1.id },
  })

  console.log('✅ Departments created')

  // ─── ADMINISTRATOR ─────────────────────────────
  const ADMINISTRATORHash = await bcrypt.hash('Admin@1234', 12)

  const ADMINISTRATOR = await prisma.person.upsert({
    where:  { email: 'admin@tcms.internal' },
    update: {},
    create: {
      employeeId:         'EMP-001',
      name:               'ADMINISTRATOR',
      email:              'admin@tcms.internal',
      passwordHash:       ADMINISTRATORHash,
      mustChangePassword: false,
      role:               UserRole.ADMINISTRATOR,
      designation:        'System Administrator',
      joiningDate:        new Date('2024-01-01'),
      unitId:             unit1.id,
      departmentId:       deptQC.id,
    },
  })

  console.log('✅ ADMINISTRATOR created')
  console.log('   Email:    admin@tcms.internal')
  console.log('   Password: Admin@1234')

  // ─── Training Head ────────────────────────────
  const trainingHeadHash = await bcrypt.hash('Training@1234', 12)

  await prisma.person.upsert({
    where:  { email: 'training.head@tcms.internal' },
    update: {},
    create: {
      employeeId:         'EMP-002',
      name:               'Training Head',
      email:              'training.head@tcms.internal',
      passwordHash:       trainingHeadHash,
      mustChangePassword: false,
      role:               UserRole.TRAINING_HEAD,
      designation:        'Head of Training',
      joiningDate:        new Date('2024-01-01'),
      unitId:             unit1.id,
      departmentId:       deptQC.id,
    },
  })

  console.log('✅ Training Head created')
  console.log('   Email:    training.head@tcms.internal')
  console.log('   Password: Training@1234')

  // ─── Sample Analyst ───────────────────────────
  const analystHash = await bcrypt.hash('Analyst@1234', 12)

  await prisma.person.upsert({
    where:  { email: 'analyst@tcms.internal' },
    update: {},
    create: {
      employeeId:         'EMP-003',
      name:               'Dr. R. Sharma',
      email:              'analyst@tcms.internal',
      passwordHash:       analystHash,
      mustChangePassword: true,
      role:               UserRole.USER,
      designation:        'Senior Analyst',
      joiningDate:        new Date('2024-06-01'),
      unitId:             unit1.id,
      departmentId:       deptQC.id,
    },
  })

  console.log('✅ Sample Analyst created')
  console.log('   Email:    analyst@tcms.internal')
  console.log('   Password: Analyst@1234')

  console.log('\n🎉 Seeding complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })