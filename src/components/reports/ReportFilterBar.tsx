'use client'

export interface ReportFilters {
  search: string  // matched against name and/or employeeId
  status: string  // '' = all
  date:   string  // 'YYYY-MM-DD', '' = no exact-date filter
  month:  string  // 'YYYY-MM', '' = no month filter
}

export const EMPTY_REPORT_FILTERS: ReportFilters = { search: '', status: '', date: '', month: '' }

export function hasActiveFilters(filters: ReportFilters): boolean {
  return !!(filters.search || filters.status || filters.date || filters.month)
}

/** Checks a single row's extracted fields against the current filter set. All active filters must match (AND). */
export function matchesReportFilters(
  filters: ReportFilters,
  fields: { name: string; employeeId?: string; status?: string; dates: (string | null | undefined)[] },
): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search) {
    const inName = fields.name.toLowerCase().includes(search)
    const inId   = (fields.employeeId ?? '').toLowerCase().includes(search)
    if (!inName && !inId) return false
  }
  if (filters.status && fields.status !== filters.status) return false
  if (filters.date) {
    const hit = fields.dates.some((d) => !!d && d.slice(0, 10) === filters.date)
    if (!hit) return false
  }
  if (filters.month) {
    const hit = fields.dates.some((d) => !!d && d.slice(0, 7) === filters.month)
    if (!hit) return false
  }
  return true
}

export function ReportFilterBar({
  filters,
  onChange,
  statusOptions,
  searchPlaceholder = 'Search name or employee ID...',
}: {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
  statusOptions?: { value: string; label: string }[]
  searchPlaceholder?: string
}) {
  const inputClass = 'px-3 py-2 rounded-lg border text-sm outline-none'
  const inputStyle = { borderColor: '#e5e7eb' }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder={searchPlaceholder}
        className={`${inputClass} flex-1 min-w-[200px]`}
        style={inputStyle}
      />
      {statusOptions && statusOptions.length > 0 && (
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className={inputClass}
          style={inputStyle}
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}
      <input
        type="date"
        value={filters.date}
        onChange={(e) => onChange({ ...filters, date: e.target.value })}
        title="Filter by exact date"
        className={inputClass}
        style={inputStyle}
      />
      <input
        type="month"
        value={filters.month}
        onChange={(e) => onChange({ ...filters, month: e.target.value })}
        title="Filter by month"
        className={inputClass}
        style={inputStyle}
      />
      {hasActiveFilters(filters) && (
        <button
          onClick={() => onChange(EMPTY_REPORT_FILTERS)}
          className="px-3 py-2 rounded-lg text-xs font-medium border"
          style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
