import { NextRequest, NextResponse } from 'next/server'
import { getSession }      from '@/lib/auth'
import { prisma }          from '@/lib/prisma'
import { logAuditEvent }   from '@/modules/audit-trail'
import type { UserRole }   from '@/lib/types'

const CAN_RESOLVE: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_RESOLVE.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    action,           // 'REASSIGNED' | 'OVERRIDE'
    resolutionNotes,
    justification,
  } = body

  if (!action || !resolutionNotes || !justification) {
    return NextResponse.json(
      { message: 'Action, resolution notes, and justification are required' },
      { status: 400 }
    )
  }

  if (!['REASSIGNED', 'OVERRIDE'].includes(action)) {
    return NextResponse.json(
      { message: 'Action must be REASSIGNED or OVERRIDE' },
      { status: 400 }
    )
  }

  if (justification.trim().length < 30) {
    return NextResponse.json(
      { message: 'Justification must be at least 30 characters for this action' },
      { status: 400 }
    )
  }

  // Get the flagged person with topic details
  const person = await prisma.person.findUnique({
    where:  { id: params.id },
    select: {
      id:                     true,
      name:                   true,
      employeeId:             true,
      flaggedForReassignment: true,
      flagTopicId:            true,
      flagCycleCount:         true,
    },
  })

  if (!person) {
    return NextResponse.json({ message: 'Person not found' }, { status: 404 })
  }

  if (!person.flaggedForReassignment) {
    return NextResponse.json(
      { message: 'This person is not currently flagged for reassignment' },
      { status: 400 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Clear the flag and record resolution
      await tx.person.update({
        where: { id: params.id },
        data:  {
          flaggedForReassignment: false,
          resolvedAt:             new Date(),
          resolvedById:           session.user.id,
          resolutionAction:       action,
          resolutionNotes,
        },
      })

      // If OVERRIDE — create a fresh assignment on the failed topic
      if (action === 'OVERRIDE' && person.flagTopicId) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 21) // 21 days for override

        await tx.trainingAssignment.create({
          data: {
            personId:     params.id,
            topicId:      person.flagTopicId,
            trigger:      'RETRAINING',
            status:       'NOT_STARTED',
            assignedById: session.user.id,
            dueDate,
            needBasis:    `Override granted by Training Head after ${person.flagCycleCount} failed cycles. Justification: ${justification}`,
          },
        })
      }

      // Notify the person of the resolution
      const topic = person.flagTopicId
        ? await tx.trainingTopic.findUnique({
            where:  { id: person.flagTopicId },
            select: { name: true },
          })
        : null

      await tx.notification.create({
        data: {
          personId: params.id,
          type:     'ASSIGNMENT',
          channel:  'IN_APP',
          title:    action === 'REASSIGNED'
            ? 'Job responsibilities review completed'
            : 'Additional training opportunity granted',
          message: action === 'REASSIGNED'
            ? `Your Training Coordinator has reviewed your training record for "${topic?.name ?? 'the topic'}". Your job responsibilities will be updated accordingly. Please speak with your manager.`
            : `Your Training Coordinator has granted you an additional opportunity to complete "${topic?.name ?? 'the topic'}" training. A new assignment has been created with a 21-day deadline.`,
        },
      })
    })

    // Audit log outside transaction
    await logAuditEvent({
      userId:        session.user.id,
      action:        'UPDATE',
      module:        'ADMIN',
      recordId:      params.id,
      recordType:    'Person',
      beforeValue:   { flaggedForReassignment: true, flagCycleCount: person.flagCycleCount },
      afterValue:    {
        flaggedForReassignment: false,
        resolutionAction:       action,
        resolutionNotes,
        resolvedBy:             session.user.id,
      },
      justification,
    })

    return NextResponse.json({
      message: action === 'REASSIGNED'
        ? 'Person marked as reassigned. Flag cleared.'
        : 'Override granted. New training assignment created.',
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Resolution failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}