// ── CSV export helper ─────────────────────────────────────────────
// This is NOT a server action — it is a pure synchronous utility.
// Kept separate from actions.ts because 'use server' files
// require all exports to be async functions.

export function convertToCSV(
  headers: string[],
  rows:    string[][]
): string {
  const escape = (val: string) =>
    `"${(val ?? '').toString().replace(/"/g, '""')}"`

  return [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n')
}