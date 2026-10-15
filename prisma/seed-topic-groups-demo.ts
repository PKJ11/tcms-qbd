// Demo dataset for the trainer-only "Topic Group" sidebar feature.
// Builds on top of `npm run seed` (base departments/units/sections + admin).
//
// Seeds FOUR independent teams, each with its own trainer, team members
// (some spread across sections, some nested two levels deep for the "My
// Team" org chart), dummy topics, a unit-wide Topic Group, and one or more
// section-scoped Topic Groups layering extra induction training onto just
// that section — so the unit-vs-section cascading rule can be exercised
// across several different departments/units, not just QA / Unit-II:
//
//   - RAMDAS      — QA / Unit-II  (new sections created for this demo)
//   - SURESH IYER — QC / Unit-I   (uses the app's real HPLC + GC sections)
//   - MEERA KRISHNAN — QC / Unit-II (uses the real Wet lab section; flat team)
//   - KAVYA MENON — IT / Unit-I   (department had zero sections — two added)
//
// Run with: npm run seed:topic-groups

import { PrismaClient, TrainingType, AssignmentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'QBD@1234'

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

async function upsertPerson(data: {
  employeeId:   string
  name:         string
  email:        string
  designation:  string
  roles:        ('TRAINER' | 'TRAINEE')[]
  departmentId: string
  unitId:       string
  sectionId?:   string | null
  joiningDate:  Date
  managerId?:   string | null
}) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  const person = await prisma.person.upsert({
    where: { employeeId: data.employeeId },
    update: {},
    create: {
      employeeId:         data.employeeId,
      name:               data.name,
      email:              data.email,
      passwordHash,
      mustChangePassword: false,
      designation:        data.designation,
      joiningDate:        data.joiningDate,
      departmentId:       data.departmentId,
      unitId:             data.unitId,
      sectionId:          data.sectionId ?? null,
      managerId:          data.managerId ?? null,
      roles:              { create: data.roles.map((role) => ({ role })) },
    },
  })

  // upsert's `update: {}` leaves an already-existing row's section/manager
  // alone, so reruns after this layout changed need an explicit set.
  const sectionId = data.sectionId ?? null
  const managerId = data.managerId ?? null
  if (person.sectionId !== sectionId || person.managerId !== managerId) {
    await prisma.person.update({ where: { id: person.id }, data: { sectionId, managerId } })
  }

  return { ...person, sectionId, managerId }
}

async function upsertDummyTopic(opts: { slug: string; name: string; description: string; createdById: string }) {
  return prisma.trainingTopic.upsert({
    where:  { id: `seeded-tg-${opts.slug}` },
    update: {},
    create: {
      id:           `seeded-tg-${opts.slug}`,
      name:         opts.name,
      description:  opts.description,
      trainingType: TrainingType.ACKNOWLEDGEMENT_ONLY,
      createdById:  opts.createdById,
    },
  })
}

async function upsertSection(unitId: string, code: string, name: string) {
  return prisma.section.upsert({
    where:  { unitId_code: { unitId, code } },
    update: {},
    create: { unitId, code, name },
  })
}

async function upsertTopicGroup(opts: {
  id:           string
  name:         string
  departmentId: string
  unitId:       string
  sectionId:    string | null
  createdById:  string
  topicIds:     string[]
}) {
  const existing = await prisma.topicGroup.findUnique({ where: { id: opts.id } })
  if (existing) return existing

  return prisma.topicGroup.create({
    data: {
      id:           opts.id,
      name:         opts.name,
      departmentId: opts.departmentId,
      unitId:       opts.unitId,
      sectionId:    opts.sectionId,
      createdById:  opts.createdById,
      items: {
        create: opts.topicIds.map((topicId, i) => ({ topicId, position: i })),
      },
    },
  })
}

type Member = { person: { id: string; employeeId: string; sectionId: string | null }; joiningDate: Date }

// Cascading rule: everyone in the unit gets the unit-wide topics; only
// members of a matching section additionally get that section's topics —
// mirrors autoAssignTopicGroupInduction().
async function seedInductionAssignments(opts: {
  members:                Member[]
  unitTopicIds:           string[]
  sectionTopicIdsBySection: Map<string, string[]>
  assignedById:           string
}) {
  let created = 0
  for (const { person, joiningDate } of opts.members) {
    const dueDate = addMonths(joiningDate, 1)
    const topicIds = [
      ...opts.unitTopicIds,
      ...(person.sectionId ? opts.sectionTopicIdsBySection.get(person.sectionId) ?? [] : []),
    ]

    for (const topicId of topicIds) {
      const existingAssignment = await prisma.trainingAssignment.findFirst({
        where: { personId: person.id, topicId, trigger: 'INDUCTION' },
      })
      if (existingAssignment) continue

      const { trainingType } = await prisma.trainingTopic.findUniqueOrThrow({
        where: { id: topicId }, select: { trainingType: true },
      })
      await prisma.trainingAssignment.create({
        data: {
          personId:     person.id,
          topicId,
          trigger:      'INDUCTION',
          trainingType,
          status:       AssignmentStatus.NOT_STARTED,
          assignedById: opts.assignedById,
          dueDate,
        },
      })
      created++
    }
  }
  return created
}

async function main() {
  console.log('🌱 Seeding Topic Group demo data (4 teams across QA, QC and IT)...')

  // ════════════════════════════════════════════════════════════════════
  // TEAM 1 — RAMDAS, QA / Unit-II (new sections created for this demo)
  // ════════════════════════════════════════════════════════════════════
  {
    const deptQA  = await prisma.department.findUniqueOrThrow({ where: { code: 'QA' } })
    const qaUnit2 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptQA.id, code: 'U2' } } })

    const sectionDefs = [
      { code: 'DOC-ANL',    name: 'Documentation Analytics' },
      { code: 'CHG-CTL',    name: 'Change Control Cell' },
      { code: 'DATA-REV',   name: 'Data Review Cell' },
      { code: 'COMPLIANCE', name: 'Compliance Monitoring' },
      { code: 'TRN-COORD',  name: 'Training Coordination' },
    ]
    const sections = new Map<string, { id: string; name: string }>()
    for (const s of sectionDefs) sections.set(s.code, await upsertSection(qaUnit2.id, s.code, s.name))
    const docAnalytics = sections.get('DOC-ANL')!
    console.log(`✅ [QA/Unit-II] ${sections.size} sections ready`)

    const ramdas = await upsertPerson({
      employeeId: '300', name: 'RAMDAS', email: 'ramdas@tcms.internal',
      designation: 'QA Training Officer', roles: ['TRAINER'],
      departmentId: deptQA.id, unitId: qaUnit2.id, joiningDate: daysFromNow(-400),
    })
    console.log(`✅ [QA/Unit-II] Trainer RAMDAS (${ramdas.employeeId})`)

    const teamDefs = [
      { employeeId: '301', name: 'SUNITA PATIL',   designation: 'QA Analyst',        days: -20, sectionCode: 'CHG-CTL'    as string | null, managerEmployeeId: null as string | null },
      { employeeId: '302', name: 'MANOJ VERMA',    designation: 'QA Analyst',        days: -15, sectionCode: 'DATA-REV',  managerEmployeeId: null },
      { employeeId: '303', name: 'PRIYA NAIR',     designation: 'Junior QA Analyst', days: -10, sectionCode: 'DOC-ANL',   managerEmployeeId: '305' },
      { employeeId: '304', name: 'AKASH SINGH',    designation: 'Junior QA Analyst', days: -8,  sectionCode: 'DOC-ANL',   managerEmployeeId: '305' },
      { employeeId: '305', name: 'DEEPIKA RAO',    designation: 'QA Officer',        days: -5,  sectionCode: null,        managerEmployeeId: null },
      { employeeId: '306', name: 'VIKRAM MEHTA',   designation: 'QA Analyst',        days: -3,  sectionCode: 'COMPLIANCE', managerEmployeeId: null },
      { employeeId: '307', name: 'NEHA JOSHI',     designation: 'Junior QA Analyst', days: -1,  sectionCode: 'TRN-COORD', managerEmployeeId: '308' },
      { employeeId: '308', name: 'ROHIT KULKARNI', designation: 'QA Officer',        days: 0,   sectionCode: null,        managerEmployeeId: null },
    ]

    // Pass 1 — create everyone reporting directly to the trainer first
    // (a managerEmployeeId may point to a teammate created later in this
    // same list), then pass 2 reassigns the ones with a specific sub-lead.
    const members: Member[] = []
    for (const m of teamDefs) {
      const sectionId = m.sectionCode ? sections.get(m.sectionCode)!.id : null
      const person = await upsertPerson({
        employeeId: m.employeeId, name: m.name, email: `${m.name.toLowerCase().replace(/\s+/g, '.')}@tcms.internal`,
        designation: m.designation, roles: ['TRAINEE'],
        departmentId: deptQA.id, unitId: qaUnit2.id, sectionId,
        joiningDate: daysFromNow(m.days), managerId: ramdas.id,
      })
      members.push({ person, joiningDate: daysFromNow(m.days) })
    }
    for (const m of teamDefs.filter((m) => m.managerEmployeeId)) {
      const subordinate = members.find((x) => x.person.employeeId === m.employeeId)!.person
      const manager      = members.find((x) => x.person.employeeId === m.managerEmployeeId)!.person
      await prisma.person.update({ where: { id: subordinate.id }, data: { managerId: manager.id } })
    }
    console.log(`✅ [QA/Unit-II] ${members.length} team members created (2-level org chart under RAMDAS)`)

    const topicDefs = [
      { slug: 'gdp',         name: 'Good Documentation Practices (GDP)', description: 'ALCOA+ aligned documentation standards for GxP records.' },
      { slug: 'gmp',         name: 'GMP Fundamentals',                   description: 'Core Good Manufacturing Practice principles.' },
      { slug: 'change-ctl',  name: 'Change Control Awareness',           description: 'Raising, assessing and closing change control requests.' },
      { slug: 'capa',        name: 'CAPA Fundamentals',                  description: 'Root cause analysis and corrective/preventive action basics.' },
      { slug: 'deviation',   name: 'Deviation Management Basics',        description: 'Identifying, reporting and investigating deviations.' },
      { slug: 'sop-writing', name: 'SOP Writing Guidelines',             description: 'House style and structure for writing SOPs.' },
      { slug: 'qrm',         name: 'Quality Risk Management (QRM) Overview', description: 'Risk identification, assessment and mitigation basics.' },
      { slug: 'audit',       name: 'Internal Audit Awareness',           description: 'What to expect and how to respond during an internal audit.' },
      { slug: 'equip-qual',  name: 'Equipment Qualification Basics',     description: 'IQ/OQ/PQ lifecycle overview for lab equipment.' },
      { slug: 'doc-control', name: 'Document Control Procedures',        description: 'Issuance, versioning and retirement of controlled documents.' },
      { slug: 'oos-oot',     name: 'Handling OOS/OOT Results',           description: 'Initial response and escalation for out-of-spec/trend results.' },
      { slug: 'calibration', name: 'Calibration Awareness',              description: 'Why and how instruments are calibrated on schedule.' },
    ]
    const topicIds = new Map<string, string>()
    for (const t of topicDefs) topicIds.set(t.slug, (await upsertDummyTopic({ ...t, createdById: ramdas.id })).id)
    console.log(`✅ [QA/Unit-II] ${topicIds.size} dummy topics ready`)

    const unitTopicSlugs    = ['gdp', 'gmp', 'change-ctl', 'capa']
    const sectionTopicSlugs = ['doc-control']

    await upsertTopicGroup({
      id: 'seeded-tg-group-qa-unit2-core', name: 'QA Unit-II Core Induction',
      departmentId: deptQA.id, unitId: qaUnit2.id, sectionId: null, createdById: ramdas.id,
      topicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
    })
    await upsertTopicGroup({
      id: 'seeded-tg-group-doc-analytics-extra', name: 'Documentation Analytics Induction Add-on',
      departmentId: deptQA.id, unitId: qaUnit2.id, sectionId: docAnalytics.id, createdById: ramdas.id,
      topicIds: sectionTopicSlugs.map((s) => topicIds.get(s)!),
    })
    console.log('✅ [QA/Unit-II] Topic Groups: whole-unit (4 topics) + Documentation Analytics add-on (1 topic)')

    const created = await seedInductionAssignments({
      members,
      unitTopicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
      sectionTopicIdsBySection: new Map([[docAnalytics.id, sectionTopicSlugs.map((s) => topicIds.get(s)!)]]),
      assignedById: ramdas.id,
    })
    console.log(`✅ [QA/Unit-II] ${created} induction assignments created (4 per member, 5 for Documentation Analytics)`)
  }

  // ════════════════════════════════════════════════════════════════════
  // TEAM 2 — SURESH IYER, QC / Unit-I (uses the app's real HPLC + GC sections)
  // ════════════════════════════════════════════════════════════════════
  {
    const deptQC  = await prisma.department.findUniqueOrThrow({ where: { code: 'QC' } })
    const qcUnit1 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptQC.id, code: 'U1' } } })
    const hplc = await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit1.id, code: 'HPLC' } } })
    const gc   = await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit1.id, code: 'GC' } } })

    const suresh = await upsertPerson({
      employeeId: '400', name: 'SURESH IYER', email: 'suresh.iyer@tcms.internal',
      designation: 'QC Training Officer', roles: ['TRAINER'],
      departmentId: deptQC.id, unitId: qcUnit1.id, joiningDate: daysFromNow(-500),
    })
    console.log(`✅ [QC/Unit-I] Trainer SURESH IYER (${suresh.employeeId})`)

    const teamDefs = [
      { employeeId: '401', name: 'ANJALI DESHPANDE', designation: 'QC Analyst',        days: -30, sectionCode: 'HPLC' as string | null, managerEmployeeId: null as string | null },
      { employeeId: '402', name: 'KARTHIK REDDY',    designation: 'QC Analyst',        days: -25, sectionCode: 'HPLC',   managerEmployeeId: '401' },
      { employeeId: '403', name: 'POOJA SHARMA',     designation: 'Junior QC Analyst', days: -18, sectionCode: 'GC',     managerEmployeeId: null },
      { employeeId: '404', name: 'RAHUL GUPTA',      designation: 'Junior QC Analyst', days: -12, sectionCode: 'GC',     managerEmployeeId: '403' },
      { employeeId: '405', name: 'SNEHA KULKARNI',   designation: 'QC Analyst',        days: -6,  sectionCode: 'LCMS',   managerEmployeeId: null },
      { employeeId: '406', name: 'AMIT JOSHI',       designation: 'QC Analyst',        days: -2,  sectionCode: null,     managerEmployeeId: null },
    ]

    // Two passes, same reasoning as the QA team above — avoids relying on
    // managerEmployeeId always pointing to an earlier list entry.
    const members: Member[] = []
    for (const m of teamDefs) {
      const sectionId = m.sectionCode
        ? (await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit1.id, code: m.sectionCode } } })).id
        : null
      const person = await upsertPerson({
        employeeId: m.employeeId, name: m.name, email: `${m.name.toLowerCase().replace(/\s+/g, '.')}@tcms.internal`,
        designation: m.designation, roles: ['TRAINEE'],
        departmentId: deptQC.id, unitId: qcUnit1.id, sectionId,
        joiningDate: daysFromNow(m.days), managerId: suresh.id,
      })
      members.push({ person, joiningDate: daysFromNow(m.days) })
    }
    for (const m of teamDefs.filter((m) => m.managerEmployeeId)) {
      const subordinate = members.find((x) => x.person.employeeId === m.employeeId)!.person
      const manager      = members.find((x) => x.person.employeeId === m.managerEmployeeId)!.person
      await prisma.person.update({ where: { id: subordinate.id }, data: { managerId: manager.id } })
    }
    console.log(`✅ [QC/Unit-I] ${members.length} team members created (2-level org chart under SURESH IYER)`)

    const topicDefs = [
      { slug: 'qc-instr-calib',  name: 'Instrument Calibration Basics',   description: 'Why and how QC lab instruments are calibrated on schedule.' },
      { slug: 'qc-column-store', name: 'Column Handling & Storage',       description: 'Correct handling, storage and logging of analytical columns.' },
      { slug: 'qc-sample-prep',  name: 'Sample Preparation SOP',          description: 'Standard sample preparation and chain-of-custody practices.' },
      { slug: 'qc-hplc-maint',   name: 'HPLC Column Maintenance',         description: 'HPLC-specific column care, flushing and troubleshooting.' },
      { slug: 'qc-gc-injector',  name: 'GC Injector Maintenance',         description: 'GC injector liner replacement and septum maintenance.' },
    ]
    const topicIds = new Map<string, string>()
    for (const t of topicDefs) topicIds.set(t.slug, (await upsertDummyTopic({ ...t, createdById: suresh.id })).id)
    console.log(`✅ [QC/Unit-I] ${topicIds.size} dummy topics ready`)

    const unitTopicSlugs = ['qc-instr-calib', 'qc-column-store', 'qc-sample-prep']

    await upsertTopicGroup({
      id: 'seeded-tg-group-qc-unit1-core', name: 'QC Unit-I Core Induction',
      departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: null, createdById: suresh.id,
      topicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
    })
    await upsertTopicGroup({
      id: 'seeded-tg-group-qc-hplc-extra', name: 'HPLC Section Induction Add-on',
      departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: hplc.id, createdById: suresh.id,
      topicIds: ['qc-hplc-maint'].map((s) => topicIds.get(s)!),
    })
    await upsertTopicGroup({
      id: 'seeded-tg-group-qc-gc-extra', name: 'GC Section Induction Add-on',
      departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: gc.id, createdById: suresh.id,
      topicIds: ['qc-gc-injector'].map((s) => topicIds.get(s)!),
    })
    console.log('✅ [QC/Unit-I] Topic Groups: whole-unit (3 topics) + HPLC add-on (1) + GC add-on (1) — two section groups in one unit')

    const created = await seedInductionAssignments({
      members,
      unitTopicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
      sectionTopicIdsBySection: new Map([
        [hplc.id, ['qc-hplc-maint'].map((s) => topicIds.get(s)!)],
        [gc.id,   ['qc-gc-injector'].map((s) => topicIds.get(s)!)],
      ]),
      assignedById: suresh.id,
    })
    console.log(`✅ [QC/Unit-I] ${created} induction assignments created (3 per member, 4 for HPLC/GC members)`)
  }

  // ════════════════════════════════════════════════════════════════════
  // TEAM 3 — MEERA KRISHNAN, QC / Unit-II (real Wet lab section; flat team)
  // ════════════════════════════════════════════════════════════════════
  {
    const deptQC  = await prisma.department.findUniqueOrThrow({ where: { code: 'QC' } })
    const qcUnit2 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptQC.id, code: 'U2' } } })
    const wetlab  = await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit2.id, code: 'WETLAB' } } })

    const meera = await upsertPerson({
      employeeId: '410', name: 'MEERA KRISHNAN', email: 'meera.krishnan@tcms.internal',
      designation: 'QC Training Officer', roles: ['TRAINER'],
      departmentId: deptQC.id, unitId: qcUnit2.id, joiningDate: daysFromNow(-300),
    })
    console.log(`✅ [QC/Unit-II] Trainer MEERA KRISHNAN (${meera.employeeId})`)

    // Flat team — nobody nested under anybody else, for contrast against
    // the two-level org charts in the other demo teams.
    const teamDefs = [
      { employeeId: '411', name: 'VARUN NAIR',     designation: 'QC Analyst',        days: -14, sectionCode: 'WETLAB' as string | null },
      { employeeId: '412', name: 'ISHITA RAO',     designation: 'Junior QC Analyst', days: -9,  sectionCode: 'WETLAB' },
      { employeeId: '413', name: 'ROHAN PATEL',    designation: 'QC Analyst',        days: -4,  sectionCode: 'GCMS' },
      { employeeId: '414', name: 'TANVI AGARWAL',  designation: 'Junior QC Analyst', days: -1,  sectionCode: null },
    ]

    const members: Member[] = []
    for (const m of teamDefs) {
      const sectionId = m.sectionCode
        ? (await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit2.id, code: m.sectionCode } } })).id
        : null
      const person = await upsertPerson({
        employeeId: m.employeeId, name: m.name, email: `${m.name.toLowerCase().replace(/\s+/g, '.')}@tcms.internal`,
        designation: m.designation, roles: ['TRAINEE'],
        departmentId: deptQC.id, unitId: qcUnit2.id, sectionId,
        joiningDate: daysFromNow(m.days), managerId: meera.id,
      })
      members.push({ person, joiningDate: daysFromNow(m.days) })
    }
    console.log(`✅ [QC/Unit-II] ${members.length} team members created (flat — all direct reports of MEERA KRISHNAN)`)

    const topicDefs = [
      { slug: 'qc-wetlab-safety', name: 'Wet Lab Safety Basics',         description: 'PPE, fume hood use and chemical handling basics.' },
      { slug: 'qc-titration',     name: 'Titration Technique Refresher', description: 'Correct titration technique and endpoint detection.' },
      { slug: 'qc-wetlab-waste',  name: 'Wet Lab Waste Disposal SOP',    description: 'Segregation and disposal of wet lab chemical waste.' },
    ]
    const topicIds = new Map<string, string>()
    for (const t of topicDefs) topicIds.set(t.slug, (await upsertDummyTopic({ ...t, createdById: meera.id })).id)
    console.log(`✅ [QC/Unit-II] ${topicIds.size} dummy topics ready`)

    const unitTopicSlugs = ['qc-wetlab-safety', 'qc-titration']

    await upsertTopicGroup({
      id: 'seeded-tg-group-qc-unit2-core', name: 'QC Unit-II Core Induction',
      departmentId: deptQC.id, unitId: qcUnit2.id, sectionId: null, createdById: meera.id,
      topicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
    })
    await upsertTopicGroup({
      id: 'seeded-tg-group-qc-wetlab-extra', name: 'Wet Lab Induction Add-on',
      departmentId: deptQC.id, unitId: qcUnit2.id, sectionId: wetlab.id, createdById: meera.id,
      topicIds: ['qc-wetlab-waste'].map((s) => topicIds.get(s)!),
    })
    console.log('✅ [QC/Unit-II] Topic Groups: whole-unit (2 topics) + Wet lab add-on (1 topic)')

    const created = await seedInductionAssignments({
      members,
      unitTopicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
      sectionTopicIdsBySection: new Map([[wetlab.id, ['qc-wetlab-waste'].map((s) => topicIds.get(s)!)]]),
      assignedById: meera.id,
    })
    console.log(`✅ [QC/Unit-II] ${created} induction assignments created (2 per member, 3 for Wet lab members)`)
  }

  // ════════════════════════════════════════════════════════════════════
  // TEAM 4 — KAVYA MENON, IT / Unit-I (department had zero sections — two added)
  // ════════════════════════════════════════════════════════════════════
  {
    const deptIT  = await prisma.department.findUniqueOrThrow({ where: { code: 'IT' } })
    const itUnit1 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptIT.id, code: 'U1' } } })

    const sectionDefs = [
      { code: 'HELPDESK', name: 'Helpdesk Support' },
      { code: 'INFRA',    name: 'Infrastructure' },
    ]
    const sections = new Map<string, { id: string; name: string }>()
    for (const s of sectionDefs) sections.set(s.code, await upsertSection(itUnit1.id, s.code, s.name))
    const helpdesk = sections.get('HELPDESK')!
    const infra    = sections.get('INFRA')!
    console.log(`✅ [IT/Unit-I] ${sections.size} sections created (department previously had none)`)

    const kavya = await upsertPerson({
      employeeId: '420', name: 'KAVYA MENON', email: 'kavya.menon@tcms.internal',
      designation: 'IT Training Officer', roles: ['TRAINER'],
      departmentId: deptIT.id, unitId: itUnit1.id, joiningDate: daysFromNow(-250),
    })
    console.log(`✅ [IT/Unit-I] Trainer KAVYA MENON (${kavya.employeeId})`)

    // Every member has a section this time — no unsectioned members, for
    // contrast against the other demo teams.
    const teamDefs = [
      { employeeId: '421', name: 'ARJUN NAIR',     designation: 'IT Support Engineer',    days: -16, sectionCode: 'HELPDESK' },
      { employeeId: '422', name: 'DIVYA MENON',    designation: 'IT Support Engineer',    days: -11, sectionCode: 'HELPDESK' },
      { employeeId: '423', name: 'RAJESH KUMAR',   designation: 'Infrastructure Engineer', days: -7, sectionCode: 'INFRA' },
      { employeeId: '424', name: 'SHREYA IYER',    designation: 'Infrastructure Engineer', days: -2, sectionCode: 'INFRA' },
    ]

    const members: Member[] = []
    for (const m of teamDefs) {
      const sectionId = sections.get(m.sectionCode)!.id
      const person = await upsertPerson({
        employeeId: m.employeeId, name: m.name, email: `${m.name.toLowerCase().replace(/\s+/g, '.')}@tcms.internal`,
        designation: m.designation, roles: ['TRAINEE'],
        departmentId: deptIT.id, unitId: itUnit1.id, sectionId,
        joiningDate: daysFromNow(m.days), managerId: kavya.id,
      })
      members.push({ person, joiningDate: daysFromNow(m.days) })
    }
    console.log(`✅ [IT/Unit-I] ${members.length} team members created (flat, split across Helpdesk/Infrastructure)`)

    const topicDefs = [
      { slug: 'it-asset-mgmt',  name: 'IT Asset Management Basics',    description: 'Asset tagging, issuance and return procedures.' },
      { slug: 'it-access-pol',  name: 'Password & Access Policy',      description: 'Password hygiene and access request procedures.' },
      { slug: 'it-helpdesk-sop', name: 'Helpdesk Ticketing SOP',       description: 'Ticket triage, escalation and SLA tracking.' },
      { slug: 'it-server-room', name: 'Server Room Access Protocol',   description: 'Physical access control and logging for the server room.' },
    ]
    const topicIds = new Map<string, string>()
    for (const t of topicDefs) topicIds.set(t.slug, (await upsertDummyTopic({ ...t, createdById: kavya.id })).id)
    console.log(`✅ [IT/Unit-I] ${topicIds.size} dummy topics ready`)

    const unitTopicSlugs = ['it-asset-mgmt', 'it-access-pol']

    await upsertTopicGroup({
      id: 'seeded-tg-group-it-unit1-core', name: 'IT Unit-I Core Induction',
      departmentId: deptIT.id, unitId: itUnit1.id, sectionId: null, createdById: kavya.id,
      topicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
    })
    await upsertTopicGroup({
      id: 'seeded-tg-group-it-helpdesk-extra', name: 'Helpdesk Induction Add-on',
      departmentId: deptIT.id, unitId: itUnit1.id, sectionId: helpdesk.id, createdById: kavya.id,
      topicIds: ['it-helpdesk-sop'].map((s) => topicIds.get(s)!),
    })
    await upsertTopicGroup({
      id: 'seeded-tg-group-it-infra-extra', name: 'Infrastructure Induction Add-on',
      departmentId: deptIT.id, unitId: itUnit1.id, sectionId: infra.id, createdById: kavya.id,
      topicIds: ['it-server-room'].map((s) => topicIds.get(s)!),
    })
    console.log('✅ [IT/Unit-I] Topic Groups: whole-unit (2 topics) + Helpdesk add-on (1) + Infrastructure add-on (1)')

    const created = await seedInductionAssignments({
      members,
      unitTopicIds: unitTopicSlugs.map((s) => topicIds.get(s)!),
      sectionTopicIdsBySection: new Map([
        [helpdesk.id, ['it-helpdesk-sop'].map((s) => topicIds.get(s)!)],
        [infra.id,    ['it-server-room'].map((s) => topicIds.get(s)!)],
      ]),
      assignedById: kavya.id,
    })
    console.log(`✅ [IT/Unit-I] ${created} induction assignments created (2 per member, 3 for everyone since all have a section)`)
  }

  console.log('🌱 Topic Group demo data seeded successfully — 4 teams across QA, QC (x2) and IT.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
