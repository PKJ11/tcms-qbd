import {
  PrismaClient,
  AppRole,
  TrainingType,
  TrainingTrigger,
  AssignmentStatus,
  AssessmentOutcome,
  FileType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const now = new Date()
function daysFromNow(n: number): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + n)
  return d
}

// ─────────────────────────────────────────────────────────────────
// Generic helpers
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
  managerId?:   string | null
  joiningDate?: string
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
      joiningDate:        new Date(data.joiningDate ?? '2024-01-01'),
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

// A scope row with unitId/sectionId omitted means "whole department".
type ScopeInput = { departmentId: string; unitId?: string; sectionId?: string }

async function createTopicWithContent(opts: {
  name:          string
  description:   string
  trainingType:  TrainingType
  createdById:   string
  approvedById:  string
  scopes:        ScopeInput[]
  materialTitle: string
  fileName:      string
  fileType:      FileType
  questions?: {
    text: string; a: string; b: string; c: string; d: string
    correct: 'A' | 'B' | 'C' | 'D'
  }[]
}) {
  const existing = await prisma.trainingTopic.findFirst({
    where:  { name: opts.name },
    select: { id: true },
  })
  if (existing) return existing

  return prisma.trainingTopic.create({
    data: {
      name:         opts.name,
      description:  opts.description,
      trainingType: opts.trainingType,
      createdById:  opts.createdById,
      topicScopes: {
        create: opts.scopes.map((s) => ({
          departmentId: s.departmentId,
          unitId:       s.unitId    ?? null,
          sectionId:    s.sectionId ?? null,
        })),
      },
      materials: {
        create: [{
          title:  opts.materialTitle,
          status: 'APPROVED',
          versions: {
            create: [{
              versionNo:     1,
              versionLabel:  'v1.0',
              versionType:   'MAJOR',
              fileUrl:       `https://storage.local/materials/${opts.fileName}`,
              fileName:      opts.fileName,
              fileType:      opts.fileType,
              changeSummary: 'Initial version',
              effectiveDate: now,
              status:        'APPROVED',
              uploadedById:  opts.createdById,
              approvedById:  opts.approvedById,
              approvedAt:    now,
            }],
          },
        }],
      },
      ...(opts.questions && opts.questions.length > 0 ? {
        questionBank: {
          create: {
            passingPercentage:   70,
            questionsPerAttempt: Math.min(5, opts.questions.length),
            maxAttempts:         3,
            questions: {
              create: opts.questions.map((q) => ({
                questionText:  q.text,
                optionA:       q.a,
                optionB:       q.b,
                optionC:       q.c,
                optionD:       q.d,
                correctAnswer: q.correct,
              })),
            },
          },
        },
      } : {}),
    },
    select: { id: true },
  })
}

async function bankIdFor(topicId: string): Promise<string> {
  const bank = await prisma.questionBank.findUniqueOrThrow({ where: { topicId } })
  return bank.id
}

async function assign(opts: {
  personId:            string
  topicId:             string
  trigger:             TrainingTrigger
  assignedById:        string
  status:               AssignmentStatus
  dueOffsetDays:        number
  startedOffsetDays?:  number
  viewedOffsetDays?:   number
  completedOffsetDays?: number
  acknowledged?:       boolean
  attempt?: { bankId: string; score: number; outcome: AssessmentOutcome; attemptNo?: number }
}) {
  const assignment = await prisma.trainingAssignment.create({
    data: {
      personId:     opts.personId,
      topicId:      opts.topicId,
      trigger:      opts.trigger,
      status:       opts.status,
      assignedById: opts.assignedById,
      dueDate:      daysFromNow(opts.dueOffsetDays),
      startedAt:    opts.startedOffsetDays   !== undefined ? daysFromNow(opts.startedOffsetDays)   : null,
      viewedAt:     opts.viewedOffsetDays    !== undefined ? daysFromNow(opts.viewedOffsetDays)    : null,
      completedAt:  opts.completedOffsetDays !== undefined ? daysFromNow(opts.completedOffsetDays) : null,
      acknowledged: opts.acknowledged ?? false,
    },
  })

  if (opts.attempt) {
    const submittedAt = daysFromNow(opts.completedOffsetDays ?? -1)
    await prisma.assessmentAttempt.create({
      data: {
        personId:     opts.personId,
        bankId:       opts.attempt.bankId,
        assignmentId: assignment.id,
        attemptNo:    opts.attempt.attemptNo ?? 1,
        score:        opts.attempt.score,
        outcome:      opts.attempt.outcome,
        answers:      {},
        startedAt:    daysFromNow((opts.completedOffsetDays ?? -1) - 0.02),
        submittedAt,
      },
    })
  }

  return assignment
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

  const demoTrainer = await upsertPerson({
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

  const demoTrainee = await upsertPerson({
    employeeId:   '1004',
    name:         'A. Verma',
    email:        'trainee@tcms.internal',
    password:     'Trainee@1234',
    designation:  'Junior Analyst',
    roles:        ['TRAINEE'],
    departmentId: deptQC.id,
    unitId:       qcUnit2.id,
    sectionId:    qcUnit2Sections['GCMS'],
    managerId:    demoTrainer.id,
  })
  console.log('✅ Trainee created — Login: 1004 / Trainee@1234')

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

  const crTrainee = await upsertPerson({
    employeeId:   'CR-002',
    name:         'P. Das (Contractual)',
    email:        'contractual.trainee@tcms.internal',
    password:     'Contract@1234',
    designation:  'Contract Analyst',
    roles:        ['CONTRACTUAL_EMPLOYEE', 'TRAINEE'],
    departmentId: deptQC.id,
    unitId:       qcUnit1.id,
    sectionId:    qcUnit1Sections['IC'],
    managerId:    demoTrainer.id,
  })
  console.log('✅ Contractual Employee (Trainee) created — Login: CR-002 / Contract@1234')

  const crBoth = await upsertPerson({
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

  // ─── Training Dept. trainer roster + reporting hierarchy ──────────
  // Source: "List of Trainers" (12 people) + Induction Training Schedule
  // sample record for Pritesh Bhiku Gurav (Employee No. 408). A 4-5 level
  // reporting chain is built on purpose so "My team" (recursive) and
  // "My reportees" (direct only) produce visibly different result sets.

  const PASSWORD = 'Password@123'

  const vishalTendulkar = await upsertPerson({
    employeeId: '2001', name: 'Vishal Tendulkar', email: 'vishal.tendulkar@tcms.internal',
    password: PASSWORD, designation: 'Sr. Manager–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, managerId: admin.id,
  })

  const pravinParab = await upsertPerson({
    employeeId: '2002', name: 'Pravin Parab', email: 'pravin.parab@tcms.internal',
    password: PASSWORD, designation: 'Manager–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, managerId: vishalTendulkar.id,
  })

  const rahulShelar = await upsertPerson({
    employeeId: '2003', name: 'Rahul Shelar', email: 'rahul.shelar@tcms.internal',
    password: PASSWORD, designation: 'Assistant Manager–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, managerId: pravinParab.id,
  })

  const sagarDeokar = await upsertPerson({
    employeeId: '2004', name: 'Sagar Deokar', email: 'sagar.deokar@tcms.internal',
    password: PASSWORD, designation: 'Sr. Executive–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['HPLC'], managerId: rahulShelar.id,
  })

  const latikaBansode = await upsertPerson({
    employeeId: '2005', name: 'Latika Bansode', email: 'latika.bansode@tcms.internal',
    password: PASSWORD, designation: 'Sr. Executive–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit2.id, sectionId: qcUnit2Sections['GCMS'], managerId: rahulShelar.id,
  })

  const shraddhaBandkar = await upsertPerson({
    employeeId: '2006', name: 'Shraddha Bandkar', email: 'shraddha.bandkar@tcms.internal',
    password: PASSWORD, designation: 'Executive–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['IC'], managerId: rahulShelar.id,
  })

  const nileshPatil = await upsertPerson({
    employeeId: '2007', name: 'Nilesh Patil', email: 'nilesh.patil@tcms.internal',
    password: PASSWORD, designation: 'Executive–QC', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['WETLAB'], managerId: pravinParab.id,
  })

  // Pritesh Gurav — also the Induction Training Schedule sample record
  // (Employee No. 408, joined 17-Mar-25). New joiner who is also QC SOP trainer.
  const priteshGurav = await upsertPerson({
    employeeId: '408', name: 'Pritesh Bhiku Gurav', email: 'pritesh.gurav@tcms.internal',
    password: PASSWORD, designation: 'Executive', roles: ['TRAINER', 'TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['HPLC'],
    managerId: sagarDeokar.id, joiningDate: '2025-03-17',
  })

  const ravindraZaware = await upsertPerson({
    employeeId: '2008', name: 'Ravindra Zaware', email: 'ravindra.zaware@tcms.internal',
    password: PASSWORD, designation: 'Manager–QA', roles: ['TRAINER'],
    departmentId: deptQA.id, unitId: qaUnit1.id, managerId: admin.id,
  })

  const jotibaYamatkar = await upsertPerson({
    employeeId: '2009', name: 'Jotiba Yamatkar', email: 'jotiba.yamatkar@tcms.internal',
    password: PASSWORD, designation: 'Sr. Executive–QA', roles: ['TRAINER'],
    departmentId: deptQA.id, unitId: qaUnit1.id, managerId: ravindraZaware.id,
  })

  const tanayaPawar = await upsertPerson({
    employeeId: '2010', name: 'Tanaya Pawar', email: 'tanaya.pawar@tcms.internal',
    password: PASSWORD, designation: 'Executive–QA', roles: ['TRAINER'],
    departmentId: deptQA.id, unitId: qaUnit2.id, managerId: jotibaYamatkar.id,
  })

  const satishKarbate = await upsertPerson({
    employeeId: '2011', name: 'Satish Karbate', email: 'satish.karbate@tcms.internal',
    password: PASSWORD, designation: 'Executive-I–IT', roles: ['TRAINER'],
    departmentId: deptIT.id, unitId: itUnit1.id, managerId: admin.id,
  })

  console.log('✅ 12 trainers seeded (Vishal Tendulkar → ... → Pritesh Gurav chain, QA chain, IT)')

  // ─── Trainees under the trainer hierarchy ──────────────────────

  const omkarJadhav = await upsertPerson({
    employeeId: '3001', name: 'Omkar Jadhav', email: 'omkar.jadhav@tcms.internal',
    password: PASSWORD, designation: 'Junior Analyst', roles: ['TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['HPLC'], managerId: sagarDeokar.id,
  })

  const snehalMore = await upsertPerson({
    employeeId: '3002', name: 'Snehal More', email: 'snehal.more@tcms.internal',
    password: PASSWORD, designation: 'Junior Analyst', roles: ['TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit2.id, sectionId: qcUnit2Sections['GCMS'], managerId: latikaBansode.id,
  })

  const ajayKadam = await upsertPerson({
    employeeId: '3003', name: 'Ajay Kadam', email: 'ajay.kadam@tcms.internal',
    password: PASSWORD, designation: 'Junior Analyst', roles: ['TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['WETLAB'], managerId: nileshPatil.id,
  })

  const kavyaMenon = await upsertPerson({
    employeeId: '3004', name: 'Kavya Menon', email: 'kavya.menon@tcms.internal',
    password: PASSWORD, designation: 'QA Analyst', roles: ['TRAINEE'],
    departmentId: deptQA.id, unitId: qaUnit2.id, managerId: tanayaPawar.id,
  })

  const rohitKulkarni = await upsertPerson({
    employeeId: '3005', name: 'Rohit Kulkarni', email: 'rohit.kulkarni@tcms.internal',
    password: PASSWORD, designation: 'IT Support Executive', roles: ['TRAINEE'],
    departmentId: deptIT.id, unitId: itUnit1.id, managerId: satishKarbate.id,
  })

  console.log('✅ 5 trainees seeded under the trainer hierarchy (QC ×3, QA ×1, IT ×1)')
  console.log(`   All new trainer/trainee logins use password: ${PASSWORD} (employee ID as username)`)
  console.log('   Reporting chain (QC): Vishal(2001) → Pravin(2002) → Rahul(2003) → {Sagar(2004), Latika(2005), Shraddha(2006)}')
  console.log('     Pravin(2002) → Nilesh(2007) → Ajay(3003)   |   Sagar(2004) → {Pritesh(408), Omkar(3001)}   |   Latika(2005) → Snehal(3002)')
  console.log('   Reporting chain (QA): Ravindra(2008) → Jotiba(2009) → Tanaya(2010) → Kavya(3004)')
  console.log('   Reporting chain (IT): Satish(2011) → Rohit(3005)')

  // ─── Training topics — every training type + scope shape ──────────

  const topicGmp = await createTopicWithContent({
    name:          'GMP & Good Documentation Practices (GDP)',
    description:   'cGMP principles and documentation discipline expected across QC and QA.',
    trainingType:  'MATERIAL_MCQ',
    createdById:   vishalTendulkar.id,
    approvedById:  admin.id,
    scopes:        [{ departmentId: deptQC.id }, { departmentId: deptQA.id }],
    materialTitle: 'GMP & GDP Reference Guide',
    fileName:      'gmp-gdp-reference-guide.pdf',
    fileType:      'PDF',
    questions: [
      { text: 'GDP stands for Good ____ Practices.', a: 'Documentation', b: 'Distribution', c: 'Design', d: 'Delivery', correct: 'A' },
      { text: 'Under ALCOA+, records must be Attributable, Legible, Contemporaneous, Original and ____.', a: 'Optional', b: 'Accurate', c: 'Anonymous', d: 'Archived', correct: 'B' },
      { text: 'Correcting an entry should be done by:', a: 'Using correction fluid', b: 'Overwriting the value', c: 'Single strike-through with sign & date', d: 'Tearing the page', correct: 'C' },
      { text: 'Blank spaces on a GMP record should be:', a: 'Left blank', b: 'Struck through as "NA"', c: 'Filled with ditto marks', d: 'Removed', correct: 'B' },
      { text: 'Who is responsible for real-time documentation of an activity?', a: 'QA Head only', b: 'The person performing the activity', c: 'IT department', d: 'HR department', correct: 'B' },
    ],
  })

  const topicDataIntegrity = await createTopicWithContent({
    name:          'Data Integrity & ALCOA+ Principles',
    description:   'Data integrity, compliance expectations and USFDA approval-related QA/QC responsibilities.',
    trainingType:  'MATERIAL_MCQ',
    createdById:   ravindraZaware.id,
    approvedById:  admin.id,
    scopes:        [{ departmentId: deptQC.id }, { departmentId: deptQA.id }],
    materialTitle: 'Data Integrity & Compliance Handbook',
    fileName:      'data-integrity-handbook.pdf',
    fileType:      'PDF',
    questions: [
      { text: 'Data integrity ensures data is complete, consistent and:', a: 'Fast', b: 'Accurate', c: 'Cheap', d: 'Encrypted', correct: 'B' },
      { text: 'Sharing your login credentials with a colleague is:', a: 'Acceptable in emergencies', b: 'Never acceptable', c: 'Fine if approved verbally', d: 'Standard practice', correct: 'B' },
      { text: 'Audit trails in electronic systems must be:', a: 'Editable by users', b: 'Disabled to save space', c: 'Enabled and reviewed', d: 'Optional', correct: 'C' },
      { text: 'A regulatory audit primarily checks for:', a: 'Office decor', b: 'Data integrity & compliance', c: 'Employee attendance', d: 'Marketing material', correct: 'B' },
      { text: 'Backdating a record is:', a: 'A data integrity violation', b: 'Acceptable if justified later', c: 'Common practice', d: 'Allowed for trainees', correct: 'A' },
    ],
  })

  const topicSafety = await createTopicWithContent({
    name:          'Laboratory Safety, Health & Hygiene',
    description:   'Personnel safety, health, hygiene and cleanliness expectations for all employees.',
    trainingType:  'MATERIAL_MCQ',
    createdById:   admin.id,
    approvedById:  admin.id,
    scopes:        [
      { departmentId: deptQC.id }, { departmentId: deptQA.id },
      { departmentId: deptIT.id }, { departmentId: deptHR.id },
    ],
    materialTitle: 'Laboratory & Workplace Safety Manual',
    fileName:      'lab-safety-manual.pdf',
    fileType:      'PPT',
    questions: [
      { text: 'PPE stands for Personal Protective ____.', a: 'Equipment', b: 'Examination', c: 'Evaluation', d: 'Escort', correct: 'A' },
      { text: 'In case of a chemical spill, the first step is to:', a: 'Ignore it', b: 'Alert others and follow the SOP', c: 'Clean it with bare hands', d: 'Take a photo', correct: 'B' },
      { text: 'Eating at the workstation in a lab is:', a: 'Allowed', b: 'Not allowed', c: 'Allowed on Fridays', d: 'Allowed if quick', correct: 'B' },
      { text: 'Fire extinguisher locations should be:', a: 'Unknown to staff', b: 'Known to all employees', c: 'Known only to security', d: 'Kept secret', correct: 'B' },
      { text: 'Personal hygiene in a lab environment is:', a: 'Optional', b: 'Mandatory', c: 'Only for visitors', d: 'Reviewed yearly only', correct: 'B' },
    ],
  })

  const topicSampleHandling = await createTopicWithContent({
    name:          'Sample Receipt, Storage, Analysis & Disposal',
    description:   'Good laboratory practices for handling samples end-to-end.',
    trainingType:  'MATERIAL_MCQ',
    createdById:   pravinParab.id,
    approvedById:  vishalTendulkar.id,
    scopes:        [{ departmentId: deptQC.id }],
    materialTitle: 'Sample Handling SOP',
    fileName:      'sample-handling-sop.pdf',
    fileType:      'PDF',
    questions: [
      { text: 'Every incoming sample must be logged with a:', a: 'Unique sample ID', b: 'Sticky note', c: 'Verbal note', d: 'Nothing', correct: 'A' },
      { text: 'Samples awaiting analysis should be stored:', a: 'On any bench', b: 'As per the specified storage condition', c: 'Near a window', d: 'In a staff locker', correct: 'B' },
      { text: 'Sample disposal must follow:', a: 'Personal judgement', b: 'The approved disposal SOP', c: 'Whatever is convenient', d: 'No process at all', correct: 'B' },
      { text: 'Retention samples are kept for:', a: 'Zero days', b: 'A defined retention period per SOP', c: 'Forever, always', d: 'One hour', correct: 'B' },
      { text: 'A sample with a broken chain of custody should be:', a: 'Used anyway', b: 'Flagged and investigated', c: 'Discarded silently', d: 'Ignored', correct: 'B' },
    ],
  })

  const topicHplc = await createTopicWithContent({
    name:          'HPLC Operation SOP',
    description:   'Standard operating procedure for HPLC instrument operation and troubleshooting.',
    trainingType:  'MATERIAL_MCQ',
    createdById:   sagarDeokar.id,
    approvedById:  rahulShelar.id,
    scopes:        [{ departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: qcUnit1Sections['HPLC'] }],
    materialTitle: 'HPLC Operation & Maintenance SOP',
    fileName:      'hplc-operation-sop.pdf',
    fileType:      'PDF',
    questions: [
      { text: 'HPLC stands for High Performance Liquid ____.', a: 'Chromatography', b: 'Calibration', c: 'Centrifugation', d: 'Combustion', correct: 'A' },
      { text: 'Before starting a run, the column should be:', a: 'Skipped', b: 'Equilibrated per method', c: 'Removed', d: 'Heated to maximum', correct: 'B' },
      { text: 'Mobile phase should be prepared:', a: 'Freshly, as per method', b: 'Once a year', c: 'By any available solvent', d: 'Without filtering', correct: 'A' },
      { text: 'System suitability must be checked:', a: 'Never', b: 'Before every analytical run', c: 'Once a month', d: 'Only if it fails', correct: 'B' },
      { text: 'Air bubbles in the pump can cause:', a: 'Better resolution', b: 'Baseline noise / pressure fluctuation', c: 'Nothing', d: 'Faster runs', correct: 'B' },
    ],
  })

  const topicGcms = await createTopicWithContent({
    name:          'GC / GC-MS Operation SOP',
    description:   'Standard operating procedure for gas chromatography and GC-MS operation.',
    trainingType:  'MATERIAL_MCQ',
    createdById:   latikaBansode.id,
    approvedById:  rahulShelar.id,
    scopes:        [{ departmentId: deptQC.id, unitId: qcUnit2.id, sectionId: qcUnit2Sections['GCMS'] }],
    materialTitle: 'GC-MS Operation SOP',
    fileName:      'gcms-operation-sop.pdf',
    fileType:      'PDF',
    questions: [
      { text: 'GC-MS combines gas chromatography with:', a: 'Mass spectrometry', b: 'Microscopy', c: 'Magnetism', d: 'Manual sorting', correct: 'A' },
      { text: 'Carrier gas commonly used in GC is:', a: 'Oxygen', b: 'Helium', c: 'Chlorine', d: 'Ammonia', correct: 'B' },
      { text: 'Column bleed can be reduced by:', a: 'Overheating the column', b: 'Proper conditioning of the column', c: 'Using no carrier gas', d: 'Skipping maintenance', correct: 'B' },
      { text: 'Before injection, samples should be:', a: 'Unfiltered', b: 'Prepared as per the validated method', c: 'Heated to boiling', d: 'Left uncapped', correct: 'B' },
      { text: 'The MS detector should be tuned:', a: 'Never', b: 'As per the scheduled maintenance plan', c: 'Randomly', d: 'Only during audits', correct: 'B' },
    ],
  })

  const topicIso = await createTopicWithContent({
    name:          'ISO 17025 Awareness',
    description:   'Awareness training on ISO/IEC 17025 requirements for testing laboratories.',
    trainingType:  'MATERIAL_ONLY',
    createdById:   tanayaPawar.id,
    approvedById:  ravindraZaware.id,
    scopes:        [{ departmentId: deptQA.id }],
    materialTitle: 'ISO 17025 Awareness Deck',
    fileName:      'iso-17025-awareness.ppt',
    fileType:      'PPT',
  })

  const topicItSecurity = await createTopicWithContent({
    name:          'IT Security & Acceptable Use Policy',
    description:   'Password hygiene, data handling and acceptable use of company IT systems.',
    trainingType:  'ACKNOWLEDGEMENT_ONLY',
    createdById:   satishKarbate.id,
    approvedById:  admin.id,
    scopes:        [{ departmentId: deptIT.id }],
    materialTitle: 'IT Security & Acceptable Use Policy',
    fileName:      'it-security-policy.pdf',
    fileType:      'PDF',
  })

  const topicOrgOverview = await createTopicWithContent({
    name:          'Organization Overview & Code of Conduct',
    description:   'Entry/exit procedure, org overview, policies, culture, departments and key personnel.',
    trainingType:  'ACKNOWLEDGEMENT_ONLY',
    createdById:   admin.id,
    approvedById:  admin.id,
    scopes:        [
      { departmentId: deptQC.id }, { departmentId: deptQA.id },
      { departmentId: deptIT.id }, { departmentId: deptHR.id },
    ],
    materialTitle: 'Organization Overview & Code of Conduct',
    fileName:      'org-overview-code-of-conduct.pdf',
    fileType:      'PDF',
  })

  const topicBenefits = await createTopicWithContent({
    name:          'Employee Benefits & Leave Policy',
    description:   'Shift timings, leave policy and employee benefits.',
    trainingType:  'MATERIAL_ONLY',
    createdById:   admin.id,
    approvedById:  admin.id,
    scopes:        [
      { departmentId: deptQC.id }, { departmentId: deptQA.id },
      { departmentId: deptIT.id }, { departmentId: deptHR.id },
    ],
    materialTitle: 'Employee Benefits & Leave Policy',
    fileName:      'benefits-leave-policy.pdf',
    fileType:      'PDF',
  })

  console.log('✅ 10 training topics created (6 Material+MCQ, 2 Material-only, 2 Acknowledgement-only)')

  // ─── Assignments — deliberately varied statuses/triggers/assignors ──
  // so "All data" / "My team" / "My reportees" report views all have
  // meaningful, differing data to compare, and Training Matrix / Overdue /
  // Training Index all have rows to show.

  const gmpBankId           = await bankIdFor(topicGmp.id)
  const dataIntegrityBankId = await bankIdFor(topicDataIntegrity.id)
  const safetyBankId        = await bankIdFor(topicSafety.id)
  const sampleBankId        = await bankIdFor(topicSampleHandling.id)
  const hplcBankId          = await bankIdFor(topicHplc.id)
  const gcmsBankId          = await bankIdFor(topicGcms.id)

  // Org-wide induction/ack topic — everyone completed it on joining,
  // except the newest joiner (Pritesh) who is still mid-induction.
  const everyone = [
    admin, demoTrainer, demoTrainee, crTrainee, crBoth,
    vishalTendulkar, pravinParab, rahulShelar, sagarDeokar, latikaBansode,
    shraddhaBandkar, nileshPatil, ravindraZaware, jotibaYamatkar, tanayaPawar, satishKarbate,
    omkarJadhav, snehalMore, ajayKadam, kavyaMenon, rohitKulkarni,
  ]
  for (const person of everyone) {
    await assign({
      personId: person.id, topicId: topicOrgOverview.id, trigger: 'INDUCTION',
      assignedById: admin.id, status: 'COMPLETED',
      dueOffsetDays: -180, viewedOffsetDays: -179, acknowledged: true, completedOffsetDays: -179,
    })
    await assign({
      personId: person.id, topicId: topicBenefits.id, trigger: 'INDUCTION',
      assignedById: admin.id, status: 'COMPLETED',
      dueOffsetDays: -180, viewedOffsetDays: -178, completedOffsetDays: -178,
    })
  }
  await assign({
    personId: priteshGurav.id, topicId: topicOrgOverview.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'IN_PROGRESS',
    dueOffsetDays: 3, viewedOffsetDays: -1, startedOffsetDays: -1,
  })
  await assign({
    personId: priteshGurav.id, topicId: topicBenefits.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'NOT_STARTED', dueOffsetDays: 7,
  })

  // GMP & Data Integrity — QC + QA wide, assigned by different trainers,
  // mixed COMPLETED / IN_PROGRESS / OVERDUE / FAILED so the matrix legend
  // and "assigned by" tooltip all have something to show.
  await assign({
    personId: demoTrainee.id, topicId: topicGmp.id, trigger: 'INDUCTION',
    assignedById: demoTrainer.id, status: 'COMPLETED', dueOffsetDays: -30,
    startedOffsetDays: -32, completedOffsetDays: -29,
    attempt: { bankId: gmpBankId, score: 90, outcome: 'PASS' },
  })
  await assign({
    personId: omkarJadhav.id, topicId: topicGmp.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'COMPLETED', dueOffsetDays: -20,
    startedOffsetDays: -22, completedOffsetDays: -19,
    attempt: { bankId: gmpBankId, score: 85, outcome: 'PASS' },
  })
  await assign({
    personId: snehalMore.id, topicId: topicGmp.id, trigger: 'INDUCTION',
    assignedById: latikaBansode.id, status: 'IN_PROGRESS', dueOffsetDays: 5,
    startedOffsetDays: -2,
  })
  await assign({
    personId: ajayKadam.id, topicId: topicGmp.id, trigger: 'RETRAINING',
    assignedById: nileshPatil.id, status: 'OVERDUE', dueOffsetDays: -10,
  })
  await assign({
    personId: priteshGurav.id, topicId: topicGmp.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'NOT_STARTED', dueOffsetDays: 10,
  })
  await assign({
    personId: kavyaMenon.id, topicId: topicGmp.id, trigger: 'INDUCTION',
    assignedById: tanayaPawar.id, status: 'FAILED', dueOffsetDays: -15,
    startedOffsetDays: -17, completedOffsetDays: -14,
    attempt: { bankId: gmpBankId, score: 40, outcome: 'FAIL', attemptNo: 3 },
  })

  await assign({
    personId: shraddhaBandkar.id, topicId: topicDataIntegrity.id, trigger: 'TECHNICAL',
    assignedById: pravinParab.id, status: 'COMPLETED', dueOffsetDays: -25,
    startedOffsetDays: -27, completedOffsetDays: -24,
    attempt: { bankId: dataIntegrityBankId, score: 92, outcome: 'PASS' },
  })
  await assign({
    personId: nileshPatil.id, topicId: topicDataIntegrity.id, trigger: 'TECHNICAL',
    assignedById: pravinParab.id, status: 'IN_PROGRESS', dueOffsetDays: 8,
    startedOffsetDays: -1,
  })
  await assign({
    personId: jotibaYamatkar.id, topicId: topicDataIntegrity.id, trigger: 'TECHNICAL',
    assignedById: ravindraZaware.id, status: 'COMPLETED', dueOffsetDays: -40,
    startedOffsetDays: -42, completedOffsetDays: -39,
    attempt: { bankId: dataIntegrityBankId, score: 78, outcome: 'PASS' },
  })
  await assign({
    personId: tanayaPawar.id, topicId: topicDataIntegrity.id, trigger: 'TECHNICAL',
    assignedById: jotibaYamatkar.id, status: 'OVERDUE', dueOffsetDays: -5,
  })

  // Lab Safety — org-wide, spread across departments
  for (const [person, assignedBy, status, due] of [
    [demoTrainee,   demoTrainer,      'COMPLETED',   -60],
    [omkarJadhav,   sagarDeokar,      'COMPLETED',   -50],
    [ajayKadam,     nileshPatil,      'NOT_STARTED',   14],
    [kavyaMenon,    tanayaPawar,      'COMPLETED',   -45],
    [rohitKulkarni, satishKarbate,    'IN_PROGRESS',   6],
    [crTrainee,     demoTrainer,      'OVERDUE',       -8],
  ] as const) {
    await assign({
      personId: person.id, topicId: topicSafety.id, trigger: 'INDUCTION',
      assignedById: assignedBy.id, status,
      dueOffsetDays: due,
      ...(status === 'COMPLETED' ? { startedOffsetDays: due - 2, completedOffsetDays: due + 1,
        attempt: { bankId: safetyBankId, score: 88, outcome: 'PASS' as AssessmentOutcome } } : {}),
      ...(status === 'IN_PROGRESS' ? { startedOffsetDays: -1 } : {}),
    })
  }

  // Sample handling — QC only
  await assign({
    personId: omkarJadhav.id, topicId: topicSampleHandling.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'COMPLETED', dueOffsetDays: -18,
    startedOffsetDays: -20, completedOffsetDays: -17,
    attempt: { bankId: sampleBankId, score: 95, outcome: 'PASS' },
  })
  await assign({
    personId: priteshGurav.id, topicId: topicSampleHandling.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'NOT_STARTED', dueOffsetDays: 12,
  })
  await assign({
    personId: crBoth.id, topicId: topicSampleHandling.id, trigger: 'REFRESHER',
    assignedById: demoTrainer.id, status: 'OVERDUE', dueOffsetDays: -6,
  })

  // HPLC SOP — HPLC-section people only
  await assign({
    personId: demoTrainee.id, topicId: topicHplc.id, trigger: 'TECHNICAL',
    assignedById: demoTrainer.id, status: 'COMPLETED', dueOffsetDays: -14,
    startedOffsetDays: -16, completedOffsetDays: -13,
    attempt: { bankId: hplcBankId, score: 82, outcome: 'PASS' },
  })
  await assign({
    personId: omkarJadhav.id, topicId: topicHplc.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'IN_PROGRESS', dueOffsetDays: 4,
    startedOffsetDays: -1,
  })
  await assign({
    personId: priteshGurav.id, topicId: topicHplc.id, trigger: 'INDUCTION',
    assignedById: sagarDeokar.id, status: 'NOT_STARTED', dueOffsetDays: 15,
  })

  // GC-MS SOP — GCMS-section people only
  await assign({
    personId: demoTrainee.id, topicId: topicGcms.id, trigger: 'TECHNICAL',
    assignedById: latikaBansode.id, status: 'COMPLETED', dueOffsetDays: -22,
    startedOffsetDays: -24, completedOffsetDays: -21,
    attempt: { bankId: gcmsBankId, score: 76, outcome: 'PASS' },
  })
  await assign({
    personId: snehalMore.id, topicId: topicGcms.id, trigger: 'INDUCTION',
    assignedById: latikaBansode.id, status: 'FAILED', dueOffsetDays: -9,
    startedOffsetDays: -11, completedOffsetDays: -8,
    attempt: { bankId: gcmsBankId, score: 55, outcome: 'NEEDS_RETRAINING', attemptNo: 2 },
  })

  // ISO 17025 — QA, material-only (completes on view)
  await assign({
    personId: jotibaYamatkar.id, topicId: topicIso.id, trigger: 'EXTERNAL',
    assignedById: ravindraZaware.id, status: 'COMPLETED', dueOffsetDays: -35,
    startedOffsetDays: -36, viewedOffsetDays: -35, completedOffsetDays: -35,
  })
  await assign({
    personId: kavyaMenon.id, topicId: topicIso.id, trigger: 'EXTERNAL',
    assignedById: tanayaPawar.id, status: 'NOT_STARTED', dueOffsetDays: 20,
  })

  // IT security — ack-only, IT dept
  await assign({
    personId: rohitKulkarni.id, topicId: topicItSecurity.id, trigger: 'INDUCTION',
    assignedById: satishKarbate.id, status: 'COMPLETED',
    dueOffsetDays: -5, acknowledged: true, completedOffsetDays: -5,
  })

  console.log('✅ Assignments seeded across the hierarchy with varied statuses/triggers/assignors')

  // ─── Analyst qualification records — feeds the Qualification Status report ──

  const techHplc = await prisma.technique.upsert({
    where:  { code: 'HPLC-ANALYSIS' },
    update: {},
    create: { name: 'HPLC Analysis', code: 'HPLC-ANALYSIS', type: 'INSTRUMENT', departmentId: deptQC.id },
  })
  const techGcms = await prisma.technique.upsert({
    where:  { code: 'GCMS-ANALYSIS' },
    update: {},
    create: { name: 'GC-MS Analysis', code: 'GCMS-ANALYSIS', type: 'INSTRUMENT', departmentId: deptQC.id },
  })
  const techTitration = await prisma.technique.upsert({
    where:  { code: 'WET-TITRATION' },
    update: {},
    create: { name: 'Wet Chemistry Titration', code: 'WET-TITRATION', type: 'METHOD', departmentId: deptQC.id },
  })

  await prisma.qualificationRecord.create({
    data: {
      personId: sagarDeokar.id, techniqueId: techHplc.id, status: 'APPROVED', outcome: 'COMPETENT',
      performedOn: daysFromNow(-300), supervisorId: rahulShelar.id, initiatedById: rahulShelar.id,
      initiatedAt: daysFromNow(-310), approvedAt: daysFromNow(-300), expiryDate: daysFromNow(20),
    },
  })
  await prisma.qualificationRecord.create({
    data: {
      personId: latikaBansode.id, techniqueId: techGcms.id, status: 'APPROVED', outcome: 'COMPETENT',
      performedOn: daysFromNow(-100), supervisorId: rahulShelar.id, initiatedById: rahulShelar.id,
      initiatedAt: daysFromNow(-110), approvedAt: daysFromNow(-100), expiryDate: daysFromNow(265),
    },
  })
  await prisma.qualificationRecord.create({
    data: {
      personId: omkarJadhav.id, techniqueId: techHplc.id, status: 'IN_PROGRESS',
      supervisorId: sagarDeokar.id, initiatedById: sagarDeokar.id, initiatedAt: daysFromNow(-5),
    },
  })
  await prisma.qualificationRecord.create({
    data: {
      personId: demoTrainee.id, techniqueId: techTitration.id, status: 'EXPIRED', outcome: 'COMPETENT',
      performedOn: daysFromNow(-400), supervisorId: demoTrainer.id, initiatedById: demoTrainer.id,
      initiatedAt: daysFromNow(-410), approvedAt: daysFromNow(-400), expiryDate: daysFromNow(-35),
    },
  })

  console.log('✅ Qualification records seeded (HPLC, GC-MS, Wet Titration — approved/in-progress/expired mix)')

  console.log('\n🎉 Seeding complete.')
  console.log('\nDepartment Structure:')
  console.log('  Quality Control  → Unit-I / Unit-II  (8 sections each)')
  console.log('  Quality Assurance → Unit-I QA / Unit-II QA')
  console.log('  IT               → Unit-I / Unit-II')
  console.log('  HR & Admin       → Unit-I / Unit-II')
  console.log('\nTest the 3 report scopes as:')
  console.log('  All data     → login as 1001 (Administrator) or 1002 (Viewer)')
  console.log('  My team      → login as 2001 Vishal Tendulkar (5-level QC team) or 2002 Pravin Parab')
  console.log('  My reportees → login as 2003 Rahul Shelar (3 direct reports) or 2004 Sagar Deokar (2 direct reports)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
