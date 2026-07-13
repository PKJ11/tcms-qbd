'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AssessmentPlayer } from './AssessmentPlayer';

interface MyAssignmentForAssessment {
  id:      string
  topic:   { id: string; name: string }
  status:  string
  hasBank: boolean
  bankId:  string | null
  attemptsUsed: number
  maxAttempts:  number
}

interface Bank {
  id: string
  passingPercentage:   number
  questionsPerAttempt: number
  maxAttempts:         number
  isActive:            boolean
  topic:   { id: string; name: string }
  _count:  { questions: number }
}

export function AssessmentsView({ canManage }: { canManage: boolean }) {
  if (canManage) return <BankManagementView />
  return <TakeAssessmentView />
}

// ── USER VIEW — pending assessments from their assignments ────────

function TakeAssessmentView() {
  const searchParams = useSearchParams()
  const autoAssignmentId = searchParams.get('assignmentId')

  const [pending,  setPending]  = useState<MyAssignmentForAssessment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [active,   setActive]   = useState<MyAssignmentForAssessment | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)

    // Step 1 — get all non-completed assignments
    const res  = await fetch('/api/assignments?view=mine')
    const data = await res.json()
    const assignments = (data.assignments ?? []).filter(
      (a: { status: string }) => a.status !== 'COMPLETED'
    )

    const withBanks: MyAssignmentForAssessment[] = []

    for (const a of assignments) {
      // Step 2 — check if this topic has an active question bank
      const bankRes  = await fetch(`/api/assessments/topic/${a.topic.id}`)
      const bankData = await bankRes.json()

      if (!bankData.bank?.isActive) continue

      const bank = bankData.bank

      // Step 3 — count attempts for THIS assignment + THIS bank only
      // Both filters are required to get the correct count
      const attemptsRes = await fetch(
        `/api/assessments/attempts?assignmentId=${a.id}&bankId=${bank.id}`
      )
      const attemptsData = await attemptsRes.json()
      const attemptsUsed = attemptsData.attempts?.length ?? 0

      withBanks.push({
        id:           a.id,
        topic:        a.topic,
        status:       a.status,
        hasBank:      true,
        bankId:       bank.id,
        attemptsUsed,
        maxAttempts:  bank.maxAttempts,
      })
    }

    setPending(withBanks)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  // Deep-linked straight from "Take the assessment" on the assignment card
  useEffect(() => {
    if (!autoAssignmentId || active) return
    const match = pending.find((p) => p.id === autoAssignmentId)
    if (match) setActive(match)
  }, [autoAssignmentId, pending, active])

  if (active) {
    return (
      <AssessmentPlayer
        assignmentId={active.id}
        bankId={active.bankId!}
        topicName={active.topic.name}
        onDone={() => { setActive(null); fetchPending() }}
      />
    )
  }

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Checking for pending assessments...
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <p className="text-sm text-gray-400">No assessments pending right now</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((p) => {
            const remaining = p.maxAttempts - p.attemptsUsed
            const exhausted = remaining <= 0

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border p-5 flex items-center justify-between"
                style={{ borderColor: exhausted ? '#fecaca' : '#e5e7eb' }}
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {p.topic.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {exhausted
                      ? `All ${p.maxAttempts} attempts used — contact your Training Coordinator`
                      : `Attempt ${p.attemptsUsed + 1} of ${p.maxAttempts}`
                    }
                  </p>
                </div>
                <button
                  onClick={() => !exhausted && setActive(p)}
                  disabled={exhausted}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: exhausted ? '#9ca3af' : '#2d6a4f' }}
                >
                  {exhausted ? 'No attempts left' : 'Start assessment'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── ADMIN VIEW — manage question banks ─────────────────────────────

function BankManagementView() {
  const [banks,   setBanks]   = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBanks() {
      setLoading(true)
      const res  = await fetch('/api/assessments/banks')
      const data = await res.json()
      setBanks(data.banks ?? [])
      setLoading(false)
    }
    fetchBanks()
  }, [])

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading question banks...
        </div>
      ) : banks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <p className="text-sm text-gray-400">No question banks created yet</p>
          <a href="/assessments/banks/new" className="text-sm font-medium" style={{ color: '#2d6a4f' }}>
            Create the first question bank →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <a
              key={bank.id}
              href={`/assessments/banks/${bank.id}`}
              className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {bank.topic.name}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={
                    bank.isActive
                      ? { background: '#f0fdf4', color: '#166534' }
                      : { background: '#f9fafb', color: '#6b7280' }
                  }
                >
                  {bank.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>
                  <div className="font-semibold text-gray-800">{bank._count.questions}</div>
                  <div>Questions</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{bank.passingPercentage}%</div>
                  <div>Pass mark</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{bank.maxAttempts}</div>
                  <div>Max attempts</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Assessment player — embedded export ──────────────