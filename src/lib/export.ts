import { exportAll } from './db'
import type { ExportedData } from './types'

export async function exportHistoryAsJSON(): Promise<void> {
  const { profile, history } = await exportAll()
  const data: ExportedData = {
    exported_at: new Date().toISOString(),
    profile,
    history,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hibi-no-ichibun-historico-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
