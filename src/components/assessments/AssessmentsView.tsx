'use client'

import { useState, useEffect } from 'react'

interface Bank {
  id: string
  passingPercentage:   number
  questionsPerAttempt: number
  maxAttempts:         number
  isActive:            boolean
  topic:   { id: string; name: string }
  _count:  { questions: number }
}

export function AssessmentsView() {
  return <BankManagementView />
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