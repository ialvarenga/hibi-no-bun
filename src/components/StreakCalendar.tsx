import { lastNWeeks, todayStr } from '../lib/date'

interface StreakCalendarProps {
  completedDates: Set<string>
}

const WEEKS = 52
const CELL = 11
const GAP = 3
const MONTH_LABELS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
]
const WEEKDAY_LABELS_PT = ['', 'Seg', '', 'Qua', '', 'Sex', '']

export default function StreakCalendar({ completedDates }: StreakCalendarProps) {
  const weeks = lastNWeeks(WEEKS)
  const today = todayStr()

  let lastMonth = -1
  const monthLabels = weeks.map((week) => {
    const firstReal = week.find((d): d is string => d !== null)
    if (!firstReal) return null
    const month = new Date(firstReal).getMonth()
    if (month === lastMonth) return null
    lastMonth = month
    return MONTH_LABELS_PT[month]
  })

  return (
    <div className="mt-4 flex gap-2">
      <div className="flex flex-col mt-[18px] shrink-0" style={{ gap: GAP }}>
        {WEEKDAY_LABELS_PT.map((label, i) => (
          <span
            key={i}
            style={{ height: CELL, lineHeight: `${CELL}px` }}
            className="text-[9px] text-ink-soft"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col" style={{ gap: GAP }}>
          <div className="flex" style={{ gap: GAP }}>
            {monthLabels.map((label, i) => (
              <span key={i} style={{ width: CELL }} className="text-[9px] text-ink-soft">
                {label ?? ''}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => {
                  if (!day || day > today) {
                    return <div key={di} style={{ width: CELL, height: CELL }} />
                  }
                  const done = completedDates.has(day)
                  return (
                    <div
                      key={di}
                      title={day}
                      style={{ width: CELL, height: CELL }}
                      className={`rounded-sm ${done ? 'bg-vermillion' : 'bg-paper-line/50'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
