'use client'

import { useState, useEffect, useCallback } from 'react'

interface TeamMemberNode {
  id:          string
  name:        string
  employeeId:  string
  designation: string
  roles:       string[]
  department:  { id: string; name: string; code: string }
  unit:        { id: string; name: string } | null
  joiningDate: string | null
  children:    TeamMemberNode[]
}

interface DepartmentBreakdown {
  departmentId:   string
  departmentName: string
  count:          number
}

interface Overview {
  root:                TeamMemberNode | null
  totalTeamSize:       number
  departmentBreakdown: DepartmentBreakdown[]
}

const DEPT_COLORS = ['#2d6a4f', '#1d4ed8', '#c2410c', '#7c3aed', '#0891b2', '#be185d', '#854d0e']

function TeamNode({ node, depth }: { node: TeamMemberNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = node.children.length > 0

  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 w-5 h-5 mt-3 rounded-full border flex items-center justify-center text-xs"
            style={{ borderColor: '#d1d5db', color: '#6b7280', background: '#fff' }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span className="flex-shrink-0 w-5" />
        )}

        <div
          className="flex-1 bg-white rounded-xl border p-3 mb-2 flex items-center justify-between gap-3 flex-wrap"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{node.name}</span>
              <span className="text-xs text-gray-400">{node.employeeId}</span>
              {node.roles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: '#f5f3ff', color: '#6d28d9' }}
                >
                  {r.replace('_', ' ')}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {node.designation} &nbsp;·&nbsp; {node.department.name}
              {node.unit ? ` → ${node.unit.name}` : ''}
            </div>
          </div>
          {hasChildren && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {node.children.length} direct report{node.children.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 pl-4" style={{ borderLeft: '2px solid #e5e7eb' }}>
          {node.children.map((c) => (
            <TeamNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TeamOverview() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading,  setLoading]  = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/topic-groups/team')
    const data = await res.json()
    setOverview(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading your team...
      </div>
    )
  }

  if (!overview || !overview.root || overview.totalTeamSize === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
        <p className="text-sm text-gray-400">
          No one reports to you yet — team members appear here once they're assigned you as manager.
        </p>
      </div>
    )
  }

  const maxCount = Math.max(1, ...overview.departmentBreakdown.map((d) => d.count))

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total team size',    value: overview.totalTeamSize },
          { label: 'Direct reports',     value: overview.root.children.length },
          { label: 'Departments in team', value: overview.departmentBreakdown.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
            <div className="text-2xl font-bold" style={{ color: '#2d6a4f' }}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Department breakdown chart */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb' }}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Team by department</h3>
        <div className="flex flex-col gap-3">
          {overview.departmentBreakdown.map((d, i) => (
            <div key={d.departmentId} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-600 truncate flex-shrink-0">{d.departmentName}</div>
              <div className="flex-1 rounded-full overflow-hidden" style={{ background: '#f3f4f6', height: 18 }}>
                <div
                  className="h-full rounded-full transition-all flex items-center justify-end px-2"
                  style={{
                    width:      `${(d.count / maxCount) * 100}%`,
                    background: DEPT_COLORS[i % DEPT_COLORS.length],
                    minWidth:   22,
                  }}
                >
                  <span className="text-xs font-semibold text-white">{d.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive org tree */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb' }}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Reporting structure <span className="text-xs font-normal text-gray-400">(click − / + to expand or collapse)</span>
        </h3>
        <div className="ml-6 pl-4" style={{ borderLeft: '2px solid #e5e7eb' }}>
          {overview.root.children.map((c) => (
            <TeamNode key={c.id} node={c} depth={0} />
          ))}
        </div>
      </div>
    </div>
  )
}
