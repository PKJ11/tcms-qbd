// Rich demo/test dataset for the Vercel testing deployment.
// Builds on top of `npm run seed` (base departments/units/sections + admin).
// Run with: npm run seed:demo
//
// Creates: extra people across every role, techniques, training topics with
// materials + question banks + questions, assignments in every status,
// assessment attempts, qualification records with signatories/certificates,
// notifications, and a few audit log entries — enough for exercising every
// major screen without needing real document uploads.

import {
  PrismaClient,
  AppRole,
  TrainingType,
  TrainingTrigger,
  AssignmentStatus,
  ContentStatus,
  FileType,
  AssessmentOutcome,
  QualStatus,
  QualOutcome,
  TechniqueType,
  SignatoryRole,
  SignatoryStatus,
  NotificationType,
  NotificationChannel,
  AuditAction,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'QBD@1234'

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function upsertPerson(data: {
  employeeId: string
  name: string
  email: string
  designation: string
  roles: AppRole[]
  departmentId: string
  unitId: string
  sectionId?: string | null
  managerId?: string | null
}) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  return prisma.person.upsert({
    where: { employeeId: data.employeeId },
    update: {},
    create: {
      employeeId: data.employeeId,
      name: data.name,
      email: data.email,
      passwordHash,
      mustChangePassword: false,
      designation: data.designation,
      joiningDate: new Date('2024-06-01'),
      departmentId: data.departmentId,
      unitId: data.unitId,
      sectionId: data.sectionId ?? null,
      managerId: data.managerId ?? null,
      roles: { create: data.roles.map((role) => ({ role })) },
    },
  })
}

async function main() {
  console.log('🌱 Seeding demo/test data (people, trainings, qualifications, assessments)...')

  // ─── Look up base org structure created by `npm run seed` ─────────
  const deptQC = await prisma.department.findUniqueOrThrow({ where: { code: 'QC' } })
  const deptQA = await prisma.department.findUniqueOrThrow({ where: { code: 'QA' } })
  const deptIT = await prisma.department.findUniqueOrThrow({ where: { code: 'IT' } })
  const admin = await prisma.person.findUniqueOrThrow({ where: { employeeId: '001' } })

  const qcUnit1 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptQC.id, code: 'U1' } } })
  const qaUnit1 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptQA.id, code: 'U1' } } })
  const itUnit1 = await prisma.unit.findUniqueOrThrow({ where: { departmentId_code: { departmentId: deptIT.id, code: 'U1' } } })

  const hplcSection = await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit1.id, code: 'HPLC' } } })
  const gcSection = await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit1.id, code: 'GC' } } })
  const lcmsSection = await prisma.section.findUniqueOrThrow({ where: { unitId_code: { unitId: qcUnit1.id, code: 'LCMS' } } })

  // ─── People ─────────────────────────────────────────────────────

  const trainerQC = await upsertPerson({
    employeeId: '100', name: 'RAVI KUMAR', email: 'ravi.kumar@tcms.internal',
    designation: 'Senior Trainer', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: hplcSection.id,
  })

  const trainerQA = await upsertPerson({
    employeeId: '101', name: 'ANITA DESAI', email: 'anita.desai@tcms.internal',
    designation: 'QA Trainer', roles: ['TRAINER'],
    departmentId: deptQA.id, unitId: qaUnit1.id,
  })

  const guestTrainer = await upsertPerson({
    employeeId: '102', name: 'DR. SUNIL RAO', email: 'sunil.rao@external.example',
    designation: 'Guest Trainer — Instrumentation', roles: ['GUEST_TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id,
  })

  const supervisorQC = await upsertPerson({
    employeeId: '110', name: 'MEERA IYER', email: 'meera.iyer@tcms.internal',
    designation: 'QC Section Head', roles: ['TRAINER'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: hplcSection.id,
  })

  const trainee1 = await upsertPerson({
    employeeId: '200', name: 'ARJUN SINGH', email: 'arjun.singh@tcms.internal',
    designation: 'Chemist I', roles: ['TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: hplcSection.id, managerId: supervisorQC.id,
  })

  const trainee2 = await upsertPerson({
    employeeId: '201', name: 'PRIYA NAIR', email: 'priya.nair@tcms.internal',
    designation: 'Chemist I', roles: ['TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: gcSection.id, managerId: supervisorQC.id,
  })

  const trainee3 = await upsertPerson({
    employeeId: '202', name: 'KARAN MEHTA', email: 'karan.mehta@tcms.internal',
    designation: 'Chemist II', roles: ['TRAINEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: lcmsSection.id, managerId: supervisorQC.id,
  })

  const trainee4 = await upsertPerson({
    employeeId: '203', name: 'SNEHA REDDY', email: 'sneha.reddy@tcms.internal',
    designation: 'Analyst', roles: ['TRAINEE'],
    departmentId: deptQA.id, unitId: qaUnit1.id, managerId: trainerQA.id,
  })

  const viewer = await upsertPerson({
    employeeId: '300', name: 'VIKRAM SHAH', email: 'vikram.shah@tcms.internal',
    designation: 'Quality Head', roles: ['VIEWER'],
    departmentId: deptQA.id, unitId: qaUnit1.id,
  })

  const contractual = await upsertPerson({
    employeeId: '400', name: 'DEEPAK JOSHI', email: 'deepak.joshi@contractor.example',
    designation: 'Contract Technician', roles: ['CONTRACTUAL_EMPLOYEE'],
    departmentId: deptQC.id, unitId: qcUnit1.id, sectionId: hplcSection.id, managerId: supervisorQC.id,
  })

  await upsertPerson({
    employeeId: '500', name: 'NEHA GUPTA', email: 'neha.gupta@tcms.internal',
    designation: 'IT Support', roles: ['TRAINEE', 'VIEWER'],
    departmentId: deptIT.id, unitId: itUnit1.id,
  })

  console.log('✅ 10 people created (trainers, guest trainer, trainees, viewer, contractual)')

  // ─── Techniques (Scientist Qualification) ──────────────────────

  const techHPLC = await prisma.technique.upsert({
    where: { code: 'TQ-HPLC' }, update: {},
    create: { name: 'HPLC Analysis', code: 'TQ-HPLC', type: TechniqueType.INSTRUMENT, departmentId: deptQC.id },
  })
  const techGC = await prisma.technique.upsert({
    where: { code: 'TQ-GC' }, update: {},
    create: { name: 'GC Analysis', code: 'TQ-GC', type: TechniqueType.INSTRUMENT, departmentId: deptQC.id },
  })
  const techLCMS = await prisma.technique.upsert({
    where: { code: 'TQ-LCMS' }, update: {},
    create: { name: 'LC-MS Analysis', code: 'TQ-LCMS', type: TechniqueType.INSTRUMENT, departmentId: deptQC.id },
  })
  const techTitration = await prisma.technique.upsert({
    where: { code: 'TQ-TITR' }, update: {},
    create: { name: 'Acid-Base Titration', code: 'TQ-TITR', type: TechniqueType.METHOD, departmentId: deptQC.id },
  })

  console.log('✅ 4 techniques created (HPLC, GC, LC-MS, Titration)')

  // ─── Training topics + materials + question banks ──────────────

  async function buildMcqTopic(opts: {
    name: string
    description: string
    createdById: string
    materialTitle: string
    questions: { text: string; a: string; b: string; c: string; d: string; correct: 'A' | 'B' | 'C' | 'D' }[]
  }) {
    const topic = await prisma.trainingTopic.upsert({
      where: { id: `seeded-${opts.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `seeded-${opts.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: opts.name,
        description: opts.description,
        trainingType: TrainingType.MATERIAL_MCQ,
        createdById: opts.createdById,
      },
    })

    await prisma.topicScope.upsert({
      where: { id: `${topic.id}-scope-qc` },
      update: {},
      create: { id: `${topic.id}-scope-qc`, topicId: topic.id, departmentId: deptQC.id, unitId: qcUnit1.id },
    })

    const material = await prisma.trainingMaterial.upsert({
      where: { id: `${topic.id}-material` },
      update: {},
      create: {
        id: `${topic.id}-material`,
        title: opts.materialTitle,
        topicId: topic.id,
        currentVersion: 1,
        status: ContentStatus.APPROVED,
      },
    })

    await prisma.materialVersion.upsert({
      where: { materialId_versionNo: { materialId: material.id, versionNo: 1 } },
      update: {},
      create: {
        materialId: material.id,
        versionNo: 1,
        versionLabel: 'v1.0',
        fileUrl: `demo-content/${material.id}-v1.pdf`,
        fileName: `${opts.materialTitle}.pdf`,
        fileType: FileType.PDF,
        changeSummary: 'Initial version',
        status: ContentStatus.APPROVED,
        uploadedById: opts.createdById,
        approvedById: admin.id,
        approvedAt: new Date(),
      },
    })

    const bank = await prisma.questionBank.upsert({
      where: { topicId: topic.id }, update: {},
      create: { topicId: topic.id, passingPercentage: 80, questionsPerAttempt: opts.questions.length, maxAttempts: 3 },
    })

    const version = await prisma.questionBankVersion.upsert({
      where: { bankId_versionNo: { bankId: bank.id, versionNo: 1 } },
      update: {},
      create: { bankId: bank.id, versionNo: 1, versionLabel: 'v1', createdById: opts.createdById },
    })

    for (const q of opts.questions) {
      const existing = await prisma.question.findFirst({ where: { bankVersionId: version.id, questionText: q.text } })
      if (!existing) {
        await prisma.question.create({
          data: {
            bankVersionId: version.id,
            questionText: q.text,
            optionA: q.a, optionB: q.b, optionC: q.c, optionD: q.d,
            correctAnswer: q.correct,
          },
        })
      }
    }

    await prisma.questionBank.update({ where: { id: bank.id }, data: { currentVersionId: version.id } })

    return { topic, material, bank, version }
  }

  const hplcTopic = await buildMcqTopic({
    name: 'HPLC Operation SOP',
    description: 'Standard operating procedure for HPLC instrument operation and maintenance.',
    createdById: trainerQC.id,
    materialTitle: 'HPLC SOP v1',
    questions: [
      { text: 'What is the typical flow rate range for analytical HPLC?', a: '0.1-2 mL/min', b: '10-20 mL/min', c: '50-100 mL/min', d: '200 mL/min', correct: 'A' },
      { text: 'Which detector is most common for HPLC?', a: 'FID', b: 'UV-Vis', c: 'TCD', d: 'ECD', correct: 'B' },
      { text: 'What should be done before starting a new HPLC column?', a: 'Skip equilibration', b: 'Increase pressure to max', c: 'Equilibrate with mobile phase', d: 'Nothing', correct: 'C' },
      { text: 'Mobile phase degassing prevents:', a: 'Column overheating', b: 'Baseline noise from bubbles', c: 'Sample degradation', d: 'UV lamp failure', correct: 'B' },
      { text: 'Which of these is a stationary phase for reverse-phase HPLC?', a: 'Silica C18', b: 'Alumina', c: 'Molecular sieve', d: 'Activated carbon only', correct: 'A' },
    ],
  })

  const gcTopic = await buildMcqTopic({
    name: 'GC Safety & Operation',
    description: 'Gas chromatography instrument safety and standard operation.',
    createdById: trainerQC.id,
    materialTitle: 'GC Safety Manual v1',
    questions: [
      { text: 'What carrier gas is most commonly used in GC?', a: 'Oxygen', b: 'Helium', c: 'Chlorine', d: 'Ammonia', correct: 'B' },
      { text: 'What is the purpose of the injector port?', a: 'Detect analytes', b: 'Vaporize the sample', c: 'Cool the column', d: 'Store waste', correct: 'B' },
      { text: 'FID stands for:', a: 'Flame Ionization Detector', b: 'Fixed Ion Detector', c: 'Flow Injection Device', d: 'Frequency Ion Detector', correct: 'A' },
      { text: 'Column bleed increases at:', a: 'Low temperature', b: 'High temperature near column max limit', c: 'Zero flow', d: 'Room temperature only', correct: 'B' },
    ],
  })

  console.log('✅ 2 MCQ training topics created with materials + question banks (HPLC, GC)')

  const inductionTopic = await prisma.trainingTopic.upsert({
    where: { id: 'seeded-data-integrity-awareness' },
    update: {},
    create: {
      id: 'seeded-data-integrity-awareness',
      name: 'Data Integrity Awareness',
      description: 'ALCOA+ principles and data integrity expectations.',
      trainingType: TrainingType.ACKNOWLEDGEMENT_ONLY,
      createdById: admin.id,
    },
  })
  await prisma.topicScope.upsert({
    where: { id: 'seeded-data-integrity-scope-qc' },
    update: {},
    create: { id: 'seeded-data-integrity-scope-qc', topicId: inductionTopic.id, departmentId: deptQC.id },
  })
  await prisma.topicScope.upsert({
    where: { id: 'seeded-data-integrity-scope-qa' },
    update: {},
    create: { id: 'seeded-data-integrity-scope-qa', topicId: inductionTopic.id, departmentId: deptQA.id },
  })

  console.log('✅ 1 acknowledgement-only induction topic created (Data Integrity Awareness)')

  // ─── Training assignments (every status) ────────────────────────

  async function upsertAssignment(opts: {
    id: string
    personId: string
    topicId: string
    trigger: TrainingTrigger
    status: AssignmentStatus
    assignedById: string
    dueDate: Date
    startedAt?: Date | null
    completedAt?: Date | null
    questionBankVersionId?: string | null
  }) {
    const { trainingType } = await prisma.trainingTopic.findUniqueOrThrow({
      where: { id: opts.topicId }, select: { trainingType: true },
    })
    return prisma.trainingAssignment.upsert({
      where: { id: opts.id },
      update: {},
      create: {
        id: opts.id,
        personId: opts.personId,
        topicId: opts.topicId,
        trigger: opts.trigger,
        trainingType,
        status: opts.status,
        assignedById: opts.assignedById,
        dueDate: opts.dueDate,
        startedAt: opts.startedAt ?? null,
        viewedAt: opts.startedAt ?? null,
        completedAt: opts.completedAt ?? null,
        acknowledged: opts.status === AssignmentStatus.COMPLETED,
        questionBankVersionId: opts.questionBankVersionId ?? null,
      },
    })
  }

  const completedAssignment = await upsertAssignment({
    id: 'seeded-assign-hplc-trainee1-completed',
    personId: trainee1.id, topicId: hplcTopic.topic.id, trigger: TrainingTrigger.INDUCTION,
    status: AssignmentStatus.COMPLETED, assignedById: trainerQC.id,
    dueDate: daysFromNow(-10), startedAt: daysFromNow(-12), completedAt: daysFromNow(-9),
    questionBankVersionId: hplcTopic.version.id,
  })

  await prisma.assessmentAttempt.upsert({
    where: { id: 'seeded-attempt-hplc-trainee1' },
    update: {},
    create: {
      id: 'seeded-attempt-hplc-trainee1',
      personId: trainee1.id, bankId: hplcTopic.bank.id, bankVersionId: hplcTopic.version.id,
      assignmentId: completedAssignment.id, attemptNo: 1, score: 100, outcome: AssessmentOutcome.PASS,
      answers: { seededQuestions: 5 },
      startedAt: daysFromNow(-9), submittedAt: daysFromNow(-9),
    },
  })

  const failedAssignment = await upsertAssignment({
    id: 'seeded-assign-gc-trainee2-failed',
    personId: trainee2.id, topicId: gcTopic.topic.id, trigger: TrainingTrigger.INDUCTION,
    status: AssignmentStatus.FAILED, assignedById: trainerQC.id,
    dueDate: daysFromNow(-5), startedAt: daysFromNow(-7),
    questionBankVersionId: gcTopic.version.id,
  })

  await prisma.assessmentAttempt.upsert({
    where: { id: 'seeded-attempt-gc-trainee2' },
    update: {},
    create: {
      id: 'seeded-attempt-gc-trainee2',
      personId: trainee2.id, bankId: gcTopic.bank.id, bankVersionId: gcTopic.version.id,
      assignmentId: failedAssignment.id, attemptNo: 1, score: 50, outcome: AssessmentOutcome.FAIL,
      answers: { seededQuestions: 4 },
      startedAt: daysFromNow(-6), submittedAt: daysFromNow(-6),
    },
  })

  await upsertAssignment({
    id: 'seeded-assign-lcms-trainee3-inprogress',
    personId: trainee3.id, topicId: hplcTopic.topic.id, trigger: TrainingTrigger.SCHEDULE,
    status: AssignmentStatus.IN_PROGRESS, assignedById: trainerQC.id,
    dueDate: daysFromNow(7), startedAt: daysFromNow(-1),
    questionBankVersionId: hplcTopic.version.id,
  })

  await upsertAssignment({
    id: 'seeded-assign-di-trainee4-notstarted',
    personId: trainee4.id, topicId: inductionTopic.id, trigger: TrainingTrigger.INDUCTION,
    status: AssignmentStatus.NOT_STARTED, assignedById: trainerQA.id,
    dueDate: daysFromNow(14),
  })

  await upsertAssignment({
    id: 'seeded-assign-gc-contractual-overdue',
    personId: contractual.id, topicId: gcTopic.topic.id, trigger: TrainingTrigger.SCHEDULE,
    status: AssignmentStatus.OVERDUE, assignedById: trainerQC.id,
    dueDate: daysFromNow(-3),
    questionBankVersionId: gcTopic.version.id,
  })

  await upsertAssignment({
    id: 'seeded-assign-di-trainee1-notstarted',
    personId: trainee1.id, topicId: inductionTopic.id, trigger: TrainingTrigger.INDUCTION,
    status: AssignmentStatus.NOT_STARTED, assignedById: trainerQC.id,
    dueDate: daysFromNow(20),
  })

  console.log('✅ 6 training assignments created across every status (completed/failed/in-progress/not-started/overdue)')

  // ─── Qualification records (Scientist Qualification flow) ──────

  const approvedQual = await prisma.qualificationRecord.upsert({
    where: { id: 'seeded-qual-trainee1-hplc-approved' },
    update: {},
    create: {
      id: 'seeded-qual-trainee1-hplc-approved',
      personId: trainee1.id, techniqueId: techHPLC.id,
      status: QualStatus.APPROVED, outcome: QualOutcome.COMPETENT,
      performedOn: daysFromNow(-8), supervisorId: supervisorQC.id, initiatedById: trainerQC.id,
      initiatedAt: daysFromNow(-9), approvedAt: daysFromNow(-2),
    },
  })

  await prisma.signatoryEntry.upsert({
    where: { qualificationId_stepOrder: { qualificationId: approvedQual.id, stepOrder: 1 } },
    update: {},
    create: {
      qualificationId: approvedQual.id, stepOrder: 1, requiredRole: SignatoryRole.QC_TRAINER,
      signedById: trainerQC.id, signedAt: daysFromNow(-3), status: SignatoryStatus.SIGNED,
      assignedToId: trainerQC.id, assignedById: admin.id, assignedAt: daysFromNow(-9),
    },
  })
  await prisma.signatoryEntry.upsert({
    where: { qualificationId_stepOrder: { qualificationId: approvedQual.id, stepOrder: 2 } },
    update: {},
    create: {
      qualificationId: approvedQual.id, stepOrder: 2, requiredRole: SignatoryRole.QA_TRAINER,
      signedById: trainerQA.id, signedAt: daysFromNow(-2), status: SignatoryStatus.SIGNED,
      assignedToId: trainerQA.id, assignedById: admin.id, assignedAt: daysFromNow(-9),
    },
  })

  await prisma.certificate.upsert({
    where: { qualificationId: approvedQual.id },
    update: {},
    create: {
      certNumber: 'CERT-2026-0001', qualificationId: approvedQual.id, personId: trainee1.id,
      issuedById: admin.id, issuedAt: daysFromNow(-2),
      fileUrl: 'demo-content/certificates/CERT-2026-0001.pdf',
    },
  })

  const pendingQual = await prisma.qualificationRecord.upsert({
    where: { id: 'seeded-qual-trainee2-gc-inprogress' },
    update: {},
    create: {
      id: 'seeded-qual-trainee2-gc-inprogress',
      personId: trainee2.id, techniqueId: techGC.id,
      status: QualStatus.IN_PROGRESS, supervisorId: supervisorQC.id, initiatedById: trainerQC.id,
      initiatedAt: daysFromNow(-4),
    },
  })

  await prisma.signatoryEntry.upsert({
    where: { qualificationId_stepOrder: { qualificationId: pendingQual.id, stepOrder: 1 } },
    update: {},
    create: {
      qualificationId: pendingQual.id, stepOrder: 1, requiredRole: SignatoryRole.QC_TRAINER,
      status: SignatoryStatus.PENDING, assignedToId: trainerQC.id, assignedById: admin.id, assignedAt: daysFromNow(-4),
    },
  })

  await prisma.qualificationRecord.upsert({
    where: { id: 'seeded-qual-trainee3-lcms-initiated' },
    update: {},
    create: {
      id: 'seeded-qual-trainee3-lcms-initiated',
      personId: trainee3.id, techniqueId: techLCMS.id,
      status: QualStatus.INITIATED, initiatedById: trainerQC.id, initiatedAt: daysFromNow(-1),
    },
  })

  await prisma.qualificationRecord.upsert({
    where: { id: 'seeded-qual-trainee4-titration-revoked' },
    update: {},
    create: {
      id: 'seeded-qual-trainee4-titration-revoked',
      personId: trainee4.id, techniqueId: techTitration.id,
      status: QualStatus.REVOKED, outcome: QualOutcome.NOT_YET_COMPETENT,
      performedOn: daysFromNow(-20), supervisorId: trainerQA.id, initiatedById: trainerQA.id,
      initiatedAt: daysFromNow(-20),
    },
  })

  console.log('✅ 4 qualification records created (approved+certificate, in-progress, initiated, revoked)')

  // ─── Notifications ───────────────────────────────────────────────

  const notifData: { id: string; personId: string; type: NotificationType; title: string; message: string; isRead: boolean }[] = [
    { id: 'seeded-notif-1', personId: trainee1.id, type: NotificationType.ASSIGNMENT, title: 'New training assigned', message: 'You have been assigned: Data Integrity Awareness', isRead: false },
    { id: 'seeded-notif-2', personId: trainee2.id, type: NotificationType.FAILED, title: 'Assessment failed', message: 'Your GC Safety & Operation assessment was not passed. Retraining required.', isRead: false },
    { id: 'seeded-notif-3', personId: contractual.id, type: NotificationType.OVERDUE, title: 'Training overdue', message: 'GC Safety & Operation is overdue.', isRead: false },
    { id: 'seeded-notif-4', personId: trainee1.id, type: NotificationType.ASSIGNMENT, title: 'Qualification approved', message: 'You are now qualified on "HPLC Analysis". Certificate issued.', isRead: true },
  ]
  for (const n of notifData) {
    await prisma.notification.upsert({
      where: { id: n.id }, update: {},
      create: { ...n, channel: NotificationChannel.IN_APP, sentAt: daysFromNow(-1), readAt: n.isRead ? daysFromNow(-1) : null },
    })
  }

  console.log('✅ 4 notifications created')

  // ─── Audit log samples ────────────────────────────────────────────

  const auditData: { id: string; userId: string; action: AuditAction; module: string; recordId: string; recordType: string; justification: string }[] = [
    { id: 'seeded-audit-1', userId: admin.id, action: AuditAction.CREATE, module: 'PERSONNEL', recordId: trainee1.id, recordType: 'Person', justification: 'Seeded demo data — new hire onboarding' },
    { id: 'seeded-audit-2', userId: trainerQC.id, action: AuditAction.ASSIGN, module: 'TRAINING', recordId: completedAssignment.id, recordType: 'TrainingAssignment', justification: 'Seeded demo data — induction training assignment' },
    { id: 'seeded-audit-3', userId: admin.id, action: AuditAction.APPROVE, module: 'QUALIFICATION', recordId: approvedQual.id, recordType: 'QualificationRecord', justification: 'Seeded demo data — qualification sign-off' },
  ]
  for (const a of auditData) {
    await prisma.auditLog.upsert({ where: { id: a.id }, update: {}, create: a })
  }

  console.log('✅ 3 audit log entries created')

  console.log('\n🎉 Demo data seeding complete.')
  console.log('\nLogin credentials (all use password QBD@1234 unless noted):')
  console.log('  001  ADMINISTRATOR       (System Administrator)')
  console.log('  100  RAVI KUMAR          (Trainer, QC)')
  console.log('  101  ANITA DESAI         (Trainer, QA)')
  console.log('  102  DR. SUNIL RAO       (Guest Trainer)')
  console.log('  110  MEERA IYER          (QC Section Head / supervisor)')
  console.log('  200  ARJUN SINGH         (Trainee, QC/HPLC) — completed training + approved qualification + certificate')
  console.log('  201  PRIYA NAIR          (Trainee, QC/GC) — failed assessment')
  console.log('  202  KARAN MEHTA         (Trainee, QC/LCMS) — in-progress training')
  console.log('  203  SNEHA REDDY         (Trainee, QA) — not-started assignment')
  console.log('  300  VIKRAM SHAH         (Viewer)')
  console.log('  400  DEEPAK JOSHI        (Contractual) — overdue assignment')
  console.log('  500  NEHA GUPTA          (IT)')
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
