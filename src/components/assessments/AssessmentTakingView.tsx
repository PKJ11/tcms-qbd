'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AssessmentPlayer } from './AssessmentPlayer'

interface Props {
  assignmentId: string
  bankId:       string
  topicName:    string
  maxAttempts:  number
}

export function AssessmentTakingView({ assignmentId, bankId, topicName, maxAttempts }: Props) {
  const router = useRouter()
  const [loading,     setLoading]     = useState(true)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [active,      setActive]      = useState(false)

  const fetchAttempts = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/assessments/attempts?assignmentId=${assignmentId}&bankId=${bankId}`)
    const data = await res.json()
    setAttemptsUsed(data.attempts?.length ?? 0)
    setLoading(false)
  }, [assignmentId, bankId])

  useEffect(() => { fetchAttempts() }, [fetchAttempts])

  if (active) {
    return (
      <AssessmentPlayer
        assignmentId={assignmentId}
        bankId={bankId}
        topicName={topicName}
        onDone={() => router.push(`/assignments/${assignmentId}`)}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Checking your attempts...
      </div>
    )
  }

  const remaining = maxAttempts - attemptsUsed
  const exhausted = remaining <= 0

  return (
    <div
      className="bg-white rounded-xl border p-5 flex items-center justify-between"
      style={{ borderColor: exhausted ? '#fecaca' : '#e5e7eb' }}
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{topicName}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {exhausted
            ? `All ${maxAttempts} attempts used — contact your Training Coordinator`
            : `Attempt ${attemptsUsed + 1} of ${maxAttempts}`}
        </p>
      </div>
      <button
        onClick={() => !exhausted && setActive(true)}
        disabled={exhausted}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: exhausted ? '#9ca3af' : '#2d6a4f' }}
      >
        {exhausted ? 'No attempts left' : 'Start assessment'}
      </button>
    </div>
  )
}
