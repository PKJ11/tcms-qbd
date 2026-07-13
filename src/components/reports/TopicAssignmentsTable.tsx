'use client'

import { formatDate } from '@/lib/utils'

export interface TopicTrainee {
  personId:    string
  name:        string
  employeeId:  string
  status:      string
  assignedAt:  string
  dueDate:     string
  completedAt: string | null
  assignedBy:  string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  COMPLETED:   { bg: '#f0fdf4', color: '#166534' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8' },
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280' },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626' },
  FAILED:      { bg: '#fff7ed', color: '#c2410c' },
}

export function TopicAssignmentsTable({
  trainees, emptyMessage,
}: {
  trainees: TopicTrainee[]
  emptyMessage: string
}) {
  if (trainees.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {['#', 'Trainee', 'Status', 'Assigned', 'Due', 'Completed', 'Assigned by'].map((h) => (
            <th
              key={h}
              className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {trainees.map((t, i) => {
          const style = STATUS_STYLES[t.status] ?? STATUS_STYLES.NOT_STARTED
          return (
            <tr key={t.personId + i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-400">{t.employeeId}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={style}
                >
                  {t.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {formatDate(t.assignedAt)}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {formatDate(t.dueDate)}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {t.completedAt ? formatDate(t.completedAt) : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {t.assignedBy}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
