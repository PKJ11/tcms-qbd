'use client'

import { useState, useEffect, useCallback } from 'react'

interface Topic { id: string; name: string }

interface EvalQuestion {
  questionText: string
  optionA:      string
  optionB:      string
  optionC:      string | null
  optionD:      string | null
}

interface EvalData {
  topicId:      string
  topicName:    string
  sopReference: string | null
  versionLabel: string | null
  questions:    EvalQuestion[]
}

export function TrainingEvalObjectiveSheet() {
  const [topics,  setTopics]  = useState<Topic[]>([])
  const [topicId, setTopicId] = useState('')
  const [data,    setData]    = useState<EvalData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/reports/training-eval-objective')
      .then((res) => res.json())
      .then((d) => setTopics(d.topics ?? []))
  }, [])

  const fetchSheet = useCallback(async (id: string) => {
    if (!id) { setData(null); return }
    setLoading(true)
    const res = await fetch(`/api/reports/training-eval-objective?topicId=${id}`)
    const d   = await res.json()
    setData(d.data ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSheet(topicId) }, [topicId, fetchSheet])

  function handleExportPdf() {
    if (!topicId) return
    window.open(`/api/reports/training-eval-objective?topicId=${topicId}&format=pdf`, '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Evaluation Sheet for Objective Questions</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Pick a topic — its objective questions print as a blank-answer evaluation sheet (form QbD/QA/F/007-05).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          >
            <option value="">Select a topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleExportPdf}
            disabled={!topicId || !data || data.questions.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {!topicId ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-gray-400">Select a topic to preview its objective questions</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading questions...
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Topic not found
        </div>
      ) : data.questions.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          This topic has no objective questions in its current question-bank version.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}
          >
            <div>
              <div className="text-sm font-semibold text-gray-900">{data.topicName}</div>
              {data.versionLabel && (
                <div className="text-xs text-gray-500 mt-0.5">Question bank: {data.versionLabel}</div>
              )}
            </div>
            <div className="text-xs text-gray-500">{data.questions.length} question{data.questions.length !== 1 ? 's' : ''}</div>
          </div>

          <ol className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            {data.questions.map((q, i) => (
              <li key={i} className="px-5 py-4">
                <div className="text-sm font-medium text-gray-900">Q{i + 1}. {q.questionText}</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs text-gray-600">
                  <div>a) {q.optionA}</div>
                  <div>b) {q.optionB}</div>
                  {q.optionC && <div>c) {q.optionC}</div>}
                  {q.optionD && <div>d) {q.optionD}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
