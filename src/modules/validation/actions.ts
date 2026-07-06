'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'

// ── Get all test cases grouped by phase ──────────────────────────

export async function getTestCases(phase?: string) {
  return prisma.testCase.findMany({
    where: {
      isActive: true,
      ...(phase && { phase: phase as 'IQ' | 'OQ' | 'PQ' | 'RT' }),
    },
    select: {
      id:          true,
      ursId:       true,
      module:      true,
      phase:       true,
      title:       true,
      description: true,
      steps:       true,
      expected:    true,
      priority:    true,
    },
    orderBy: [
      { phase:  'asc' },
      { ursId:  'asc' },
    ],
  })
}

// ── Get or create a validation run ────────────────────────────────

export async function getValidationRuns() {
  return prisma.validationRun.findMany({
    select: {
      id:          true,
      phase:       true,
      version:     true,
      environment: true,
      status:      true,
      startedAt:   true,
      completedAt: true,
      createdAt:   true,
      executedBy:  { select: { name: true } },
      approvedBy:  { select: { name: true } },
      testResults: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createValidationRun(
  input: {
    phase:       'IQ' | 'OQ' | 'PQ' | 'RT'
    version:     string
    environment: string
  },
  actorId: string
) {
  // Get all test cases for this phase
  const testCases = await prisma.testCase.findMany({
    where: { phase: input.phase, isActive: true },
    select: { id: true },
  })

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.validationRun.create({
      data: {
        phase:        input.phase,
        version:      input.version,
        environment:  input.environment,
        status:       'PLANNED',
        executedById: actorId,
      },
    })

    // Pre-create NOT_EXECUTED results for all test cases
    await tx.testResult.createMany({
      data: testCases.map((tc) => ({
        runId:       created.id,
        testCaseId:  tc.id,
        status:      'NOT_EXECUTED' as const,
      })),
    })

    return created
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'SYSTEM',
    recordId:      run.id,
    recordType:    'ValidationRun',
    beforeValue:   null,
    afterValue:    { phase: input.phase, version: input.version, environment: input.environment },
    justification: `Validation run created for ${input.phase} phase, version ${input.version}`,
  })

  return run
}

// ── Get a validation run with all results ─────────────────────────

export async function getValidationRunDetail(runId: string) {
  return prisma.validationRun.findUnique({
    where:  { id: runId },
    select: {
      id:          true,
      phase:       true,
      version:     true,
      environment: true,
      status:      true,
      startedAt:   true,
      completedAt: true,
      notes:       true,
      executedBy:  { select: { id: true, name: true } },
      approvedBy:  { select: { id: true, name: true } },
      testResults: {
        select: {
          id:             true,
          status:         true,
          actualResult:   true,
          defectNotes:    true,
          executedAt:     true,
          screenshotUrls: true,
          executedBy:     { select: { name: true } },
          testCase: {
            select: {
              id:          true,
              ursId:       true,
              module:      true,
              title:       true,
              description: true,
              steps:       true,
              expected:    true,
              priority:    true,
            },
          },
        },
        orderBy: { testCase: { ursId: 'asc' } },
      },
    },
  })
}

// ── Record test result ────────────────────────────────────────────

export async function recordTestResult(
  input: {
    resultId:    string
    status:      'PASS' | 'FAIL' | 'BLOCKED'
    actualResult: string
    defectNotes?: string
  },
  actorId: string
) {
  const result = await prisma.testResult.findUnique({
    where:  { id: input.resultId },
    select: { runId: true, testCase: { select: { ursId: true } } },
  })
  if (!result) throw new Error('Test result not found')

  await prisma.testResult.update({
    where: { id: input.resultId },
    data:  {
      status:       input.status,
      actualResult: input.actualResult,
      defectNotes:  input.defectNotes ?? null,
      executedById: actorId,
      executedAt:   new Date(),
    },
  })

  // Update run status to IN_PROGRESS on first execution
  const run = await prisma.validationRun.findUnique({
    where:  { id: result.runId },
    select: { status: true },
  })
  if (run?.status === 'PLANNED') {
    await prisma.validationRun.update({
      where: { id: result.runId },
      data:  { status: 'IN_PROGRESS', startedAt: new Date() },
    })
  }

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'SYSTEM',
    recordId:      input.resultId,
    recordType:    'TestResult',
    beforeValue:   { status: 'NOT_EXECUTED' },
    afterValue:    { status: input.status, ursId: result.testCase.ursId },
    justification: `Test case ${result.testCase.ursId} executed — result: ${input.status}`,
  })
}

// ── Complete and lock a validation run ────────────────────────────

export async function completeValidationRun(
  runId:  string,
  notes:  string,
  actorId: string
) {
  const run = await prisma.validationRun.findUnique({
    where:  { id: runId },
    select: {
      id:     true,
      status: true,
      testResults: { select: { status: true } },
    },
  })
  if (!run) throw new Error('Run not found')

  const hasFailures = run.testResults.some((r) => r.status === 'FAIL')
  const allExecuted = run.testResults.every((r) => r.status !== 'NOT_EXECUTED')

  if (!allExecuted) throw new Error('Not all test cases have been executed')

  await prisma.validationRun.update({
    where: { id: runId },
    data:  {
      status:       hasFailures ? 'IN_PROGRESS' : 'COMPLETE',
      completedAt:  new Date(),
      approvedById: actorId,
      approvedAt:   new Date(),
      notes,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'APPROVE',
    module:        'SYSTEM',
    recordId:      runId,
    recordType:    'ValidationRun',
    beforeValue:   { status: run.status },
    afterValue:    { status: hasFailures ? 'IN_PROGRESS' : 'COMPLETE', hasFailures },
    justification: notes,
  })

  return { hasFailures }
}

// ── RTM summary ────────────────────────────────────────────────────

export async function getRTMSummary() {
  const testCases = await prisma.testCase.findMany({
    where:   { isActive: true },
    select:  {
      ursId:    true,
      module:   true,
      phase:    true,
      priority: true,
      results: {
        orderBy: { executedAt: 'desc' },
        take:    1,
        select:  { status: true, executedAt: true },
      },
    },
    orderBy: [{ phase: 'asc' }, { ursId: 'asc' }],
  })

  const summary = {
    total:        testCases.length,
    byPhase:      { IQ: 0, OQ: 0, PQ: 0, RT: 0 },
    byStatus:     { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_EXECUTED: 0 },
    byPriority:   { M: 0, H: 0, D: 0 },
    passRate:     0,
  }

  for (const tc of testCases) {
    summary.byPhase[tc.phase]++
    summary.byPriority[tc.priority as 'M' | 'H' | 'D']++

    const lastResult = tc.results[0]?.status ?? 'NOT_EXECUTED'
    summary.byStatus[lastResult as keyof typeof summary.byStatus]++
  }

  const executed = summary.total - summary.byStatus.NOT_EXECUTED
  summary.passRate = executed > 0
    ? Math.round((summary.byStatus.PASS / executed) * 100)
    : 0

  return { summary, testCases }
}