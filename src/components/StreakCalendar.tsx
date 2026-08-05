import { useLayoutEffect, useRef, useState } from 'react'
import { lastNWeeks, parseLocalDateStr, todayStr } from '../lib/date'

interface StreakCalendarProps {
  completedDates: Set<string>
}

const MAX_WEEKS = 52
const MIN_CELL = 7
const GAP = 2
const LABEL_WIDTH = 20
const MONTH_LABELS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
]
const WEEKDAY_LABELS_PT = ['', 'Seg', '', 'Qua', '', 'Sex', '']

export default function StreakCalendar({ completedDates }: StreakCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(9)
  const [cols, setCols] = useState(MAX_WEEKS)

  const allWeeks = lastNWeeks(MAX_WEEKS)
  const weeks = allWeeks.slice(Math.max(0, allWeeks.length - cols))

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const available = el.clientWidth - LABEL_WIDTH - 8
      const maxFit = Math.floor((available + GAP) / (MIN_CELL + GAP))
      const n = Math.max(1, Math.min(allWeeks.length, maxFit))
      const size = Math.floor((available - (n - 1) * GAP) / n)
      setCols(n)
      setCell(Math.max(size, MIN_CELL))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [allWeeks.length])

  const today = todayStr()

  let lastMonth = -1
  const monthLabels = weeks.map((week) => {
    const firstReal = week.find((d): d is string => d !== null)
    if (!firstReal) return null
    const month = parseLocalDateStr(firstReal).getMonth()
    if (month === lastMonth) return null
    lastMonth = month
    return MONTH_LABELS_PT[month]
  })

  return (
    <div ref={containerRef} className="mt-4 flex gap-2">
      <div
        className="flex flex-col mt-[18px] shrink-0"
        style={{ gap: GAP, width: LABEL_WIDTH }}
      >
        {WEEKDAY_LABELS_PT.map((label, i) => (
          <span
            key={i}
            style={{ height: cell, lineHeight: `${cell}px` }}
            className="text-[9px] text-ink-soft"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex flex-col min-w-0" style={{ gap: GAP }}>
        <div className="flex" style={{ gap: GAP }}>
          {monthLabels.map((label, i) => (
            <span key={i} style={{ width: cell }} className="text-[9px] text-ink-soft">
              {label ?? ''}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap: GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((day, di) => {
                if (!day || day > today) {
                  return <div key={di} style={{ width: cell, height: cell }} />
                }
                const done = completedDates.has(day)
                return (
                  <div
                    key={di}
                    title={day}
                    style={{ width: cell, height: cell }}
                    className={`rounded-sm ${done ? 'bg-vermillion' : 'bg-paper-line/50'}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
