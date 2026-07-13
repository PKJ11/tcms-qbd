'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReportScope } from './ReportsHub'
import { TopicAssignmentsTable, type TopicTrainee } from './TopicAssignmentsTable'

interface Topic { id: string; name: string }

interface Report {
  topicId:     string
  topicName:   string
  trainerName: string
  trainees:    TopicTrainee[]
}

export function TopicCompletionReport({ scope }: { scope: ReportScope }) {
  const [topics,   setTopics]   = useState<Topic[]>([])
  const [topicId,  setTopicId]  = useState('')
  const [report,   setReport]   = useState<Report | null>(null)
  const [loading,  setLoading]  = useState(false)
  const isOrgWide = scope === 'all'

  useEffect(() => {
    async function fetchTopics() {
      const res  = await fetch('/api/reports/topic-completion')
      const data = await res.json()
      setTopics(data.topics ?? [])
    }
    fetchTopics()
  }, [])

  const fetchReport = useCallback(async (id: string) => {
    if (!id) { setReport(null); return }
    setLoading(true)
    const res  = await fetch(`/api/reports/topic-completion?topicId=${id}&scope=${scope}`)
    const data = await res.json()
    setReport(data.report ?? null)
    setLoading(false)
  }, [scope])

  useEffect(() => { fetchReport(topicId) }, [topicId, fetchReport])

  function handleExport() {
    if (!topicId) return
    window.open(`/api/reports/topic-completion?topicId=${topicId}&scope=${scope}&format=csv`, '_blank')
  }

  const completedCount = report?.trainees.filter((t) => t.status === 'COMPLETED').length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Topic Completion Report</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Topic, who assigned it, and the sequential list of trainees assigned to it.
            {!isOrgWide && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold"
                style={{ background: '#eff6ff', color: '#1d4ed8' }}
              >
                {scope === 'team' ? 'My team' : 'My reportees'}
              </span>
            )}
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
            onClick={handleExport}
            disabled={!topicId}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {!topicId ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-gray-400">Select a topic to view its completion report</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading report...
        </div>
      ) : !report ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Topic not found
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}
          >
            <div>
              <div className="text-sm font-semibold text-gray-900">{report.topicName}</div>
              <div className="text-xs text-gray-500 mt-0.5">Created by: {report.trainerName}</div>
            </div>
            <div className="text-xs text-gray-500">
              {completedCount} / {report.trainees.length} completed
            </div>
          </div>

          <TopicAssignmentsTable
            trainees={report.trainees}
            emptyMessage={
              isOrgWide
                ? 'No one has been assigned this topic yet.'
                : 'No one in this scope has been assigned this topic yet.'
            }
          />
        </div>
      )}
    </div>
  )
}
