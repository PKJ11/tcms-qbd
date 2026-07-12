import { PrismaClient, AppRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
  managerId?:   string | null
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
      unitId:              data.unitId,
      sectionId:           data.sectionId ?? null,
      managerId:           data.managerId ?? null,
      roles: {
        create: data.roles.map((role) => ({ role })),
      },
    },
  })
}

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
    create: { name: 'HR & Admin', code: 'HR' },
  })

  console.log('✅ Departments created (QC, QA, IT, HR & Admin)')

  // ─── QC Units + Sections ───────────────────────────────────────
  // Unit-I and Unit-II each get the same 8 sections

  const qcUnit1 = await upsertUnit(deptQC.id, 'Unit-I',  'U1')
  const qcUnit2 = await upsertUnit(deptQC.id, 'Unit-II', 'U2')

  const qcSectionDefs = [
    { name: 'LCMS',    code: 'LCMS'    },
    { name: 'GCMS',    code: 'GCMS'    },
    { name: 'GC',      code: 'GC'      },
    { name: 'HPLC',    code: 'HPLC'    },
    { name: 'Wet Lab', code: 'WETLAB'  },
    { name: 'IC',      code: 'IC'      },
    { name: 'AAS',     code: 'AAS'     },
    { name: 'ICP-MS',  code: 'ICPMS'   },
  ]

  const qcUnit1Sections: Record<string, string> = {}
  const qcUnit2Sections: Record<string, string> = {}

  for (const s of qcSectionDefs) {
    const sec1 = await upsertSection(qcUnit1.id, s.name, s.code)
    const sec2 = await upsertSection(qcUnit2.id, s.name, s.code)
    qcUnit1Sections[s.code] = sec1.id
    qcUnit2Sections[s.code] = sec2.id
  }

  console.log('✅ QC: Unit-I / Unit-II created, each with 8 sections')

  // ─── QA Units ────────────────────────────────────────────────

  const qaUnit1 = await upsertUnit(deptQA.id, 'Unit-I QA',  'U1')
  const qaUnit2 = await upsertUnit(deptQA.id, 'Unit-II QA', 'U2')

  console.log('✅ QA: Unit-I QA / Unit-II QA created (no sections)')

  // ─── IT Units ────────────────────────────────────────────────

  const itUnit1 = await upsertUnit(deptIT.id, 'Unit-I',  'U1')
  await upsertUnit(deptIT.id, 'Unit-II', 'U2')

  console.log('✅ IT: Unit-I / Unit-II created (no sections)')

  // ─── HR & Admin Units ────────────────────────────────────────

  const hrUnit1 = await upsertUnit(deptHR.id, 'Unit-I',  'U1')
  await upsertUnit(deptHR.id, 'Unit-II', 'U2')

  console.log('✅ HR & Admin: Unit-I / Unit-II created (no sections)')

  // ─── Seed Users — one per role type, covering all 3 employee types ──

  // ── Administrator (QBD Employee, numeric ID) ──────────────────
  const admin = await upsertPerson({
    employeeId:   '1001',
    name:         'ADMINISTRATOR',
    email:        'admin@tcms.internal',
    password:     'Admin@1234',
    designation:  'System Administrator',
    roles:        ['ADMINISTRATOR'],
    departmentId: deptHR.id,
    unitId:       hrUnit1.id,
  })
  console.log('✅ Administrator created — Login: 1001 / Admin@1234')

  // ── Viewer (QBD Employee) ──────────────────────────────────────
  await upsertPerson({
    employeeId:   '1002',
    name:         'QA Viewer',
    email:        'viewer@tcms.internal',
    password:     'Viewer@1234',
    designation:  'QA Reviewer',
    roles:        ['VIEWER'],
    departmentId: deptQA.id,
    unitId:       qaUnit1.id,
  })
  console.log('✅ Viewer created — Login: 1002 / Viewer@1234')

  // ── Trainer (QBD Employee) ─────────────────────────────────────
  const trainer = await upsertPerson({
    employeeId:   '1003',
    name:         'Dr. R. Sharma',
    email:        'trainer@tcms.internal',
    password:     'Trainer@1234',
    designation:  'Senior Trainer',
    roles:        ['TRAINER'],
    departmentId: deptQC.id,
    unitId:       qcUnit1.id,
    sectionId:    qcUnit1Sections['HPLC'],
    managerId:    admin.id,
  })
  console.log('✅ Trainer created — Login: 1003 / Trainer@1234')

  // ── Trainee (QBD Employee) ─────────────────────────────────────
  await upsertPerson({
    employeeId:   '1004',
    name:         'A. Verma',
    email:        'trainee@tcms.internal',
    password:     'Trainee@1234',
    designation:  'Junior Analyst',
    roles:        ['TRAINEE'],
    departmentId: deptQC.id,
    unitId:       qcUnit2.id,
    sectionId:    qcUnit2Sections['GCMS'],
    managerId:    trainer.id,
  })
  console.log('✅ Trainee created — Login: 1004 / Trainee@1234')

  // ── QBD Employee with combined roles (Trainer + Viewer) ────────
  await upsertPerson({
    employeeId:   '1005',
    name:         'S. Iyer',
    email:        'trainer.viewer@tcms.internal',
    password:     'Combo@1234',
    designation:  'QA Trainer',
    roles:        ['TRAINER', 'VIEWER'],
    departmentId: deptQA.id,
    unitId:       qaUnit2.id,
  })
  console.log('✅ Trainer+Viewer combo created — Login: 1005 / Combo@1234')

  // ── Guest Trainer (auto-ID format G-XXX) ───────────────────────
  await upsertPerson({
    employeeId:   'G-001',
    name:         'Dr. External Expert',
    email:        'guest.trainer@example.com',
    password:     'Guest@1234',
    designation:  'External Trainer',
    roles:        ['GUEST_TRAINER'],
    departmentId: deptQC.id,
    unitId:       qcUnit1.id,
  })
  console.log('✅ Guest Trainer created — Login: G-001 / Guest@1234')

  // ── Contractual Employee — Trainer only ────────────────────────
  await upsertPerson({
    employeeId:   'CR-001',
    name:         'K. Nair (Contractual)',
    email:        'contractual.trainer@tcms.internal',
    password:     'Contract@1234',
    designation:  'Contract Trainer',
    roles:        ['CONTRACTUAL_EMPLOYEE', 'TRAINER'],
    departmentId: deptIT.id,
    unitId:       itUnit1.id,
  })
  console.log('✅ Contractual Employee (Trainer) created — Login: CR-001 / Contract@1234')

  // ── Contractual Employee — Trainee only ────────────────────────
  await upsertPerson({
    employeeId:   'CR-002',
    name:         'P. Das (Contractual)',
    email:        'contractual.trainee@tcms.internal',
    password:     'Contract@1234',
    designation:  'Contract Analyst',
    roles:        ['CONTRACTUAL_EMPLOYEE', 'TRAINEE'],
    departmentId: deptQC.id,
    unitId:       qcUnit1.id,
    sectionId:    qcUnit1Sections['IC'],
    managerId:    trainer.id,
  })
  console.log('✅ Contractual Employee (Trainee) created — Login: CR-002 / Contract@1234')

  // ── Contractual Employee — both Trainer and Trainee ────────────
  await upsertPerson({
    employeeId:   'CR-003',
    name:         'M. Khan (Contractual)',
    email:        'contractual.both@tcms.internal',
    password:     'Contract@1234',
    designation:  'Contract Trainer/Analyst',
    roles:        ['CONTRACTUAL_EMPLOYEE', 'TRAINER', 'TRAINEE'],
    departmentId: deptQC.id,
    unitId:       qcUnit2.id,
    sectionId:    qcUnit2Sections['LCMS'],
  })
  console.log('✅ Contractual Employee (Trainer+Trainee) created — Login: CR-003 / Contract@1234')

  console.log('\n🎉 Seeding complete.')
  console.log('\nDepartment Structure:')
  console.log('  Quality Control  → Unit-I / Unit-II  (8 sections each)')
  console.log('  Quality Assurance → Unit-I QA / Unit-II QA')
  console.log('  IT               → Unit-I / Unit-II')
  console.log('  HR & Admin       → Unit-I / Unit-II')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
