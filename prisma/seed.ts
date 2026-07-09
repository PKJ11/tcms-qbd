import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Departments ─────────────────────────────────────────────

  const deptQC = await prisma.department.upsert({
    where:  { code: 'QC' },
    update: {},
    create: { name: 'Quality Control',  code: 'QC' },
  })

  const deptQA = await prisma.department.upsert({
    where:  { code: 'QA' },
    update: {},
    create: { name: 'Quality Assurance', code: 'QA' },
  })

  const deptIT = await prisma.department.upsert({
    where:  { code: 'IT' },
    update: {},
    create: { name: 'IT', code: 'IT' },
  })

  const deptHR = await prisma.department.upsert({
    where:  { code: 'HR' },
    update: {},
    create: { name: 'HR and Admin', code: 'HR' },
  })

  console.log('✅ Departments created')

  // ─── QC Sections ─────────────────────────────────────────────

  const qcSections = [
    { name: 'LCMS (Unit-I)',    code: 'LCMS-I'   },
    { name: 'LCMS (Unit-II)',   code: 'LCMS-II'  },
    { name: 'GCMS (Unit-I)',    code: 'GCMS-I'   },
    { name: 'GCMS (Unit-II)',   code: 'GCMS-II'  },
    { name: 'GC (Unit-I)',      code: 'GC-I'     },
    { name: 'GC (Unit-II)',     code: 'GC-II'    },
    { name: 'HPLC (Unit-I)',    code: 'HPLC-I'   },
    { name: 'HPLC (Unit-II)',   code: 'HPLC-II'  },
    { name: 'Wet lab (Unit-I)', code: 'WL-I'     },
    { name: 'Wet lab (Unit-II)', code: 'WL-II'   },
    { name: 'IC',               code: 'IC'       },
    { name: 'ICP-MS',           code: 'ICP-MS'   },
    { name: 'AAS',              code: 'AAS'      },
  ]

  for (const s of qcSections) {
    await prisma.section.upsert({
      where:  { departmentId_code: { departmentId: deptQC.id, code: s.code } },
      update: {},
      create: { name: s.name, code: s.code, departmentId: deptQC.id },
    })
  }

  console.log('✅ QC sections created (13 sections)')

  // ─── QA Sections ─────────────────────────────────────────────

  const qaSections = [
    { name: 'Unit-I QA',  code: 'QA-I'  },
    { name: 'Unit-II QA', code: 'QA-II' },
  ]

  for (const s of qaSections) {
    await prisma.section.upsert({
      where:  { departmentId_code: { departmentId: deptQA.id, code: s.code } },
      update: {},
      create: { name: s.name, code: s.code, departmentId: deptQA.id },
    })
  }

  console.log('✅ QA sections created (2 sections)')
  console.log('✅ IT has no sections')
  console.log('✅ HR and Admin has no sections')

  // ─── Seed Users ───────────────────────────────────────────────

  // Get HPLC-I section for analyst
  const hplcSection = await prisma.section.findFirst({
    where: { code: 'HPLC-I', departmentId: deptQC.id },
  })

  // Get QA-I section for training head
  const qaSection = await prisma.section.findFirst({
    where: { code: 'QA-I', departmentId: deptQA.id },
  })

  // ── Administrator (EMP-001) ───────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@1234', 12)

  await prisma.person.upsert({
    where:  { employeeId: 'EMP-001' },
    update: {},
    create: {
      employeeId:         'EMP-001',
      name:               'ADMINISTRATOR',
      email:              'admin@tcms.internal',
      passwordHash:       adminHash,
      mustChangePassword: false,
      role:               UserRole.ADMINISTRATOR,
      designation:        'System Administrator',
      joiningDate:        new Date('2024-01-01'),
      departmentId:       deptQC.id,
      sectionId:          null,  // Admin has no specific section
    },
  })

  console.log('✅ Administrator (EMP-001) created')
  console.log('   Login: EMP-001 / Admin@1234')

  // ── Training Head (EMP-002) ───────────────────────────────────
  const thHash = await bcrypt.hash('Training@1234', 12)

  await prisma.person.upsert({
    where:  { employeeId: 'EMP-002' },
    update: {},
    create: {
      employeeId:         'EMP-002',
      name:               'Training Head',
      email:              'training.head@tcms.internal',
      passwordHash:       thHash,
      mustChangePassword: false,
      role:               UserRole.TRAINING_HEAD,
      designation:        'Head QA',
      joiningDate:        new Date('2024-01-01'),
      departmentId:       deptQA.id,
      sectionId:          qaSection?.id ?? null,
    },
  })

  console.log('✅ Training Head (EMP-002) created')
  console.log('   Login: EMP-002 / Training@1234')

  // ── Sample Analyst (EMP-003) ──────────────────────────────────
  const analystHash = await bcrypt.hash('Analyst@1234', 12)

  await prisma.person.upsert({
    where:  { employeeId: 'EMP-003' },
    update: {},
    create: {
      employeeId:         'EMP-003',
      name:               'Dr. R. Sharma',
      email:              'analyst@tcms.internal',
      passwordHash:       analystHash,
      mustChangePassword: false,
      role:               UserRole.USER,
      designation:        'Senior Analyst',
      joiningDate:        new Date('2024-06-01'),
      departmentId:       deptQC.id,
      sectionId:          hplcSection?.id ?? null,
    },
  })

  console.log('✅ Analyst (EMP-003) created')
  console.log('   Login: EMP-003 / Analyst@1234')

  console.log('\n🎉 Seeding complete.')
  console.log('\nDepartment Structure:')
  console.log('  Quality Control (13 sections)')
  console.log('  Quality Assurance (2 sections)')
  console.log('  IT (no sections)')
  console.log('  HR and Admin (no sections)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })