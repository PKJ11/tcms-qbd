import { PrismaClient, AppRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

async function upsertUnit(departmentId: string, name: string, code: string) {
  return prisma.unit.upsert({
    where:  { departmentId_code: { departmentId, code } },
    update: {},
    create: { name, code, departmentId },
  })
}

async function upsertSection(unitId: string, name: string, code: string) {
  return prisma.section.upsert({
    where:  { unitId_code: { unitId, code } },
    update: {},
    create: { name, code, unitId },
  })
}

async function upsertPerson(data: {
  employeeId:   string
  name:         string
  email:        string
  password:     string
  designation:  string
  roles:        AppRole[]
  departmentId: string
  unitId:       string
  sectionId?:   string | null
}) {
  const passwordHash = await bcrypt.hash(data.password, 12)

  return prisma.person.upsert({
    where:  { employeeId: data.employeeId },
    update: {},
    create: {
      employeeId:         data.employeeId,
      name:               data.name,
      email:              data.email,
      passwordHash,
      mustChangePassword: false,
      designation:        data.designation,
      joiningDate:        new Date('2024-01-01'),
      departmentId:       data.departmentId,
      unitId:             data.unitId,
      sectionId:          data.sectionId ?? null,
      roles: {
        create: data.roles.map((role) => ({ role })),
      },
    },
  })
}

async function main() {
  console.log('🌱 Seeding database (base org structure + one admin)...')

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
    create: { name: 'HR & Admin', code: 'HR' },
  })

  console.log('✅ Departments created (Quality Control, Quality Assurance, IT, HR & Admin)')

  // ─── Units — Unit-I / Unit-II under every department ───────────

  const qcUnit1 = await upsertUnit(deptQC.id, 'Unit-I',  'U1')
  const qcUnit2 = await upsertUnit(deptQC.id, 'Unit-II', 'U2')

  await upsertUnit(deptQA.id, 'Unit-I',  'U1')
  await upsertUnit(deptQA.id, 'Unit-II', 'U2')

  const itUnit1 = await upsertUnit(deptIT.id, 'Unit-I',  'U1')
  await upsertUnit(deptIT.id, 'Unit-II', 'U2')

  await upsertUnit(deptHR.id, 'Unit-I',  'U1')
  await upsertUnit(deptHR.id, 'Unit-II', 'U2')

  console.log('✅ Units created — Unit-I / Unit-II under each department')

  // ─── Sections — Quality Control only ────────────────────────────
  // Unit-I: all 8 techniques. Unit-II: the 5 shared with Unit-I.

  const qcUnit1SectionDefs = [
    { name: 'LCMS',    code: 'LCMS'   },
    { name: 'GCMS',    code: 'GCMS'   },
    { name: 'GC',      code: 'GC'     },
    { name: 'HPLC',    code: 'HPLC'   },
    { name: 'Wet lab', code: 'WETLAB' },
    { name: 'IC',      code: 'IC'     },
    { name: 'ICP-MS',  code: 'ICPMS'  },
    { name: 'AAS',     code: 'AAS'    },
  ]

  const qcUnit2SectionDefs = [
    { name: 'LCMS',    code: 'LCMS'   },
    { name: 'GCMS',    code: 'GCMS'   },
    { name: 'GC',      code: 'GC'     },
    { name: 'HPLC',    code: 'HPLC'   },
    { name: 'Wet lab', code: 'WETLAB' },
  ]

  for (const s of qcUnit1SectionDefs) {
    await upsertSection(qcUnit1.id, s.name, s.code)
  }
  for (const s of qcUnit2SectionDefs) {
    await upsertSection(qcUnit2.id, s.name, s.code)
  }

  console.log('✅ Quality Control sections created — Unit-I (8), Unit-II (5)')

  // ─── The one seed user — Administrator, IT department ──────────

  await upsertPerson({
    employeeId:   '001',
    name:         'ADMINISTRATOR',
    email:        'admin@tcms.internal',
    password:     'QBD@1234',
    designation:  'System Administrator',
    roles:        ['ADMINISTRATOR'],
    departmentId: deptIT.id,
    unitId:       itUnit1.id,
  })

  console.log('✅ Administrator created — Login: 001 / QBD@1234')
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
