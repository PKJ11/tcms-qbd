import { type ClassValue, clsx } from 'clsx'

// Combine class names safely
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

// Format a date for display
export function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// Format date + time
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// Truncate long strings
export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '...' : str
}