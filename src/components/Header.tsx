import { Settings2, Download } from 'lucide-react'

interface HeaderProps {
  settingsOpen: boolean
  onToggleSettings: () => void
  onExport: () => void
}

export default function Header({ settingsOpen, onToggleSettings, onExport }: HeaderProps) {
  return (
    <header className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-wide text-indigo">
          日々の一文
        </h1>
        <p className="text-sm mt-1 text-ink-soft">Leitura diária, no seu ritmo</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onExport}
          className="border border-paper-line rounded-full p-2.5 text-indigo bg-card hover:bg-paper transition-colors"
          aria-label="Exportar histórico"
          title="Exportar histórico (JSON)"
        >
          <Download size={18} />
        </button>
        <button
          onClick={onToggleSettings}
          className="border border-paper-line rounded-full p-2.5 text-indigo bg-card hover:bg-paper transition-colors"
          aria-label="Configurações"
          aria-expanded={settingsOpen}
        >
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  )
}
