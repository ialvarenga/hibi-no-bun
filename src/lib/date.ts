// Formats/parses YYYY-MM-DD strings using LOCAL calendar fields rather than
// UTC (unlike toISOString()/new Date(str), which are UTC-based and roll over
// to the next day hours before local midnight for any timezone behind UTC).
function toLocalDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayStr(): string {
  return toLocalDateStr(new Date())
}

export function lastNDays(n: number): string[] {
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return toLocalDateStr(d)
  })
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = parseLocalDateStr(dateStr)
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

// Grid of `weeks` columns x 7 rows (Sun-Sat), ending on the current week,
// for a GitHub-style contribution calendar. Cells before the range start or
// after today are `null` (padding).
export function lastNWeeks(weeks: number): (string | null)[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1))
  start.setDate(start.getDate() - start.getDay()) // back up to that week's Sunday

  const cells: (string | null)[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    cells.push(toLocalDateStr(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const grid: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    grid.push(cells.slice(i, i + 7))
  }
  return grid
}
