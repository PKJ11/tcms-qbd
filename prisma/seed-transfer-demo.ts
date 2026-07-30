// Demo data for the "assign fixed trainings on department/unit transfer"
// feature. Run with: npm run seed:transfer-demo
//
// Creates one trainee (employeeId 900) sitting in Quality Assurance / Unit-I,
// and three trainings scoped to the whole Quality Control department, each
// in a different state relative to that trainee — so moving them into QC in
// the UI exercises all three checkbox states at once:
//
//   - "QC SOP Awareness"          → trainee already COMPLETED it  → red border, unchecked
//   - "QC Safety Induction"       → trainee has an active NOT_STARTED assignment → neutral badge, unchecked
//   - "QC Documentation Practices"→ trainee has never been assigned it → checked by default

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding transfer-demo data...')

  const deptQC = await prisma.department.findUnique({ where: { code: 'QC' } })
  const deptQA = await prisma.department.findUnique({ where: { code: 'QA' } })
  if (!deptQC || !deptQA) {
    throw new Error('Base departments not found — run `npm run seed` first.')
  }

  const qaUnit1 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptQA.id, code: 'U1' } } })

  const admin = await prisma.person.findUniqueOrThrow({ where: { employeeId: '001' } })
  const deptQCId = deptQC.id

  // ─── Trainee currently in QA / Unit-I ──────────────────────────

  const passwordHash = await bcrypt.hash('QBD@1234', 12)

  const trainee = await prisma.person.upsert({
    where:  { employeeId: '900' },
    update: {
      departmentId: deptQA.id,
      unitId:       qaUnit1.id,
      sectionId:    null,
    },
    create: {
      employeeId:         '900',
      name:               'Demo Trainee (Transfer Test)',
      email:              'demo.trainee@tcms.internal',
      passwordHash,
      mustChangePassword: false,
      designation:        'Junior Analyst',
      joiningDate:        new Date('2025-01-01'),
      departmentId:       deptQA.id,
      unitId:             qaUnit1.id,
      roles: { create: [{ role: 'TRAINEE' }] },
    },
  })

  console.log(`✅ Trainee ready — employeeId 900 / QBD@1234, currently in QA / Unit-I (id: ${trainee.id})`)

  // ─── Three topics, all scoped to the whole QC department ───────

  async function upsertScopedTopic(name: string) {
    let topic = await prisma.trainingTopic.findFirst({ where: { name } })
    if (!topic) {
      topic = await prisma.trainingTopic.create({
        data: {
          name,
          description:  `Demo topic for transfer-assignment testing: ${name}`,
          trainingType: 'ACKNOWLEDGEMENT_ONLY',
          createdById:  admin.id,
        },
      })
    }

    const existingScope = await prisma.topicScope.findFirst({
      where: { topicId: topic.id, departmentId: deptQCId, unitId: null, sectionId: null },
    })
    if (!existingScope) {
      await prisma.topicScope.create({
        data: { topicId: topic.id, departmentId: deptQCId },
      })
    }

    return topic
  }

  const topicCompleted = await upsertScopedTopic('QC SOP Awareness')
  const topicActive    = await upsertScopedTopic('QC Safety Induction')
  await upsertScopedTopic('QC Documentation Practices') // left unassigned on purpose — should default checked

  console.log('✅ Three trainings scoped to Quality Control (department-wide)')

  // ─── Prior COMPLETED assignment for topicCompleted ─────────────

  const alreadyCompleted = await prisma.trainingAssignment.findFirst({
    where: { personId: trainee.id, topicId: topicCompleted.id, status: 'COMPLETED' },
  })
  if (!alreadyCompleted) {
    await prisma.trainingAssignment.create({
      data: {
        personId:     trainee.id,
        topicId:      topicCompleted.id,
        trigger:      'EXTERNAL',
        status:       'COMPLETED',
        assignedById: admin.id,
        dueDate:      new Date('2025-02-01'),
        completedAt:  new Date('2025-01-20'),
        acknowledged: true,
      },
    })
  }

  // ─── Existing active (NOT_STARTED) assignment for topicActive ──

  const alreadyActive = await prisma.trainingAssignment.findFirst({
    where: {
      personId: trainee.id,
      topicId:  topicActive.id,
      status:   { in: ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE'] },
    },
  })
  if (!alreadyActive) {
    await prisma.trainingAssignment.create({
      data: {
        personId:     trainee.id,
        topicId:      topicActive.id,
        trigger:      'EXTERNAL',
        status:       'NOT_STARTED',
        assignedById: admin.id,
        dueDate:      new Date('2026-09-01'),
      },
    })
  }

  console.log('✅ Assignment history seeded — one COMPLETED, one NOT_STARTED, one never assigned')
  console.log('\n🎉 Transfer-demo seeding complete.')
  console.log(`\nNext: log in as 001 / QBD@1234, open /personnel/${trainee.id}, change Department to "Quality Control" (any unit), and save.`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
