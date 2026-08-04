import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDaysStr, lastNDays, lastNWeeks, parseLocalDateStr, todayStr } from './date'

afterEach(() => {
  vi.useRealTimers()
})

describe('todayStr', () => {
  it('returns the local calendar date, not the UTC one', () => {
    // toISOString()/UTC would already report the next day at this local
    // time for any timezone behind UTC — todayStr() must not do that.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 3, 22, 0, 0)) // Aug 3, 22:00 local
    expect(todayStr()).toBe('2026-08-03')
  })
})

describe('addDaysStr', () => {
  it('adds days within a month', () => {
    expect(addDaysStr('2026-08-03', 1)).toBe('2026-08-04')
  })

  it('carries over month and year boundaries', () => {
    expect(addDaysStr('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDaysStr('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('parseLocalDateStr', () => {
  it('parses YYYY-MM-DD as local midnight on that calendar date', () => {
    const d = parseLocalDateStr('2026-08-03')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(3)
  })
})

describe('lastNDays', () => {
  it('returns n consecutive local dates ending today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 3, 12, 0, 0))
    expect(lastNDays(3)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
  })
})

describe('lastNWeeks', () => {
  it('returns full 7-day weeks, ending on today with later days padded as null', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 3, 12, 0, 0)) // Monday, Aug 3 2026
    const weeks = lastNWeeks(2)

    weeks.forEach((week) => expect(week).toHaveLength(7))

    // Cells are generated in chronological order (week by week, Sun..Sat
    // within each), so flattening preserves date order.
    const flat = weeks.flat()
    const todayIndex = flat.indexOf('2026-08-03')
    expect(todayIndex).toBeGreaterThanOrEqual(0)
    expect(flat.slice(todayIndex + 1).every((d) => d === null)).toBe(true)
  })
})
