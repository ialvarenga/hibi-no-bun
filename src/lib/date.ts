export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function lastNDays(n: number): string[] {
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
