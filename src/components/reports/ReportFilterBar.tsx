'use client'

export interface DateRangeValue {
  from: string  // 'YYYY-MM-DD', '' = no lower bound
  to:   string  // 'YYYY-MM-DD', '' = no upper bound
}

export const EMPTY_DATE_RANGE: DateRangeValue = { from: '', to: '' }

export interface DateFilterConfig {
  key:   string  // e.g. 'assigned' | 'due' | 'completed' | 'approved' | 'expiry'
  label: string  // e.g. 'Assigned date'
}

export interface ReportFilters {
  search: string  // matched against name and/or employeeId
  status: string  // '' = all
  month:  string  // 'YYYY-MM', '' = no month filter
  // Keyed by the DateFilterConfig.key the caller declared — each dimension
  // (assigned / due / completed / ...) is filtered independently, not as
  // "any of these dates falls in range."
  dateRanges: Record<string, DateRangeValue>
}

export const EMPTY_REPORT_FILTERS: ReportFilters = { search: '', status: '', month: '', dateRanges: {} }

export function hasActiveFilters(filters: ReportFilters): boolean {
  const hasDateRange = Object.values(filters.dateRanges).some((r) => r.from || r.to)
  return !!(filters.search || filters.status || filters.month || hasDateRange)
}

/** Checks a single row's extracted fields against the current filter set. All active filters must match (AND). */
export function matchesReportFilters(
  filters: ReportFilters,
  fields: {
    name: string
    employeeId?: string
    status?: string
    // Keyed the same way as the DateFilterConfig[] passed to ReportFilterBar —
    // e.g. { assigned: t.assignedAt, due: t.dueDate, completed: t.completedAt }
    dateValues: Record<string, string | null | undefined>
  },
): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search) {
    const inName = fields.name.toLowerCase().includes(search)
    const inId   = (fields.employeeId ?? '').toLowerCase().includes(search)
    if (!inName && !inId) return false
  }
  if (filters.status && fields.status !== filters.status) return false

  for (const [key, range] of Object.entries(filters.dateRanges)) {
    if (!range.from && !range.to) continue
    const value = fields.dateValues[key]
    if (!value) return false
    const day = value.slice(0, 10)
    if (range.from && day < range.from) return false
    if (range.to   && day > range.to)   return false
  }

  if (filters.month) {
    const hit = Object.values(fields.dateValues).some((d) => !!d && d.slice(0, 7) === filters.month)
    if (!hit) return false
  }
  return true
}

export function ReportFilterBar({
  filters,
  onChange,
  statusOptions,
  dateFilters = [],
  searchPlaceholder = 'Search name or employee ID...',
}: {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
  statusOptions?: { value: string; label: string }[]
  dateFilters?: DateFilterConfig[]
  searchPlaceholder?: string
}) {
  const inputClass = 'px-2 py-1.5 rounded-lg border text-xs outline-none'
  const inputStyle = { borderColor: '#e5e7eb' }

  function setRange(key: string, part: keyof DateRangeValue, value: string) {
    const current = filters.dateRanges[key] ?? EMPTY_DATE_RANGE
    onChange({ ...filters, dateRanges: { ...filters.dateRanges, [key]: { ...current, [part]: value } } })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder={searchPlaceholder}
        className={`${inputClass} flex-1 min-w-[200px] py-2 text-sm`}
        style={inputStyle}
      />
      {statusOptions && statusOptions.length > 0 && (
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className={`${inputClass} py-2 text-sm`}
          style={inputStyle}
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}

      {dateFilters.map((df) => {
        const range = filters.dateRanges[df.key] ?? EMPTY_DATE_RANGE
        return (
          <div
            key={df.key}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
            style={{ borderColor: '#e5e7eb', background: '#fafafa' }}
          >
            <span className="text-xs text-gray-500 whitespace-nowrap">{df.label}:</span>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange(df.key, 'from', e.target.value)}
              title={`${df.label} — from`}
              max={range.to || undefined}
              className={inputClass}
              style={{ ...inputStyle, background: '#fff' }}
            />
            <span className="text-xs text-gray-300">–</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange(df.key, 'to', e.target.value)}
              title={`${df.label} — to`}
              min={range.from || undefined}
              className={inputClass}
              style={{ ...inputStyle, background: '#fff' }}
            />
          </div>
        )
      })}

      <input
        type="month"
        value={filters.month}
        onChange={(e) => onChange({ ...filters, month: e.target.value })}
        title="Filter by month"
        className={`${inputClass} py-2 text-sm`}
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
