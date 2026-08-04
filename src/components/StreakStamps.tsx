import { useState } from 'react'
import { lastNDays } from '../lib/date'
import StreakCalendar from './StreakCalendar'

interface StreakStampsProps {
  completedDates: Set<string>
}

export default function StreakStamps({ completedDates }: StreakStampsProps) {
  const [expanded, setExpanded] = useState(false)
  const days = lastNDays(7).map((key) => ({ key, done: completedDates.has(key) }))

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {days.map((d) => (
          <div
            key={d.key}
            title={d.key}
            className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center font-display font-bold text-[11px] ${
              d.done
                ? 'border-vermillion text-vermillion bg-vermillion/10'
                : 'border-paper-line text-paper-line'
            }`}
          >
            {d.done ? '済' : ''}
          </div>
        ))}
        <span className="text-xs ml-2 text-ink-soft">últimos 7 dias</span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs ml-auto underline underline-offset-2 text-indigo-soft"
        >
          {expanded ? 'Ocultar calendário' : 'Ver calendário completo'}
        </button>
      </div>
      {expanded && <StreakCalendar completedDates={completedDates} />}
    </div>
  )
}
