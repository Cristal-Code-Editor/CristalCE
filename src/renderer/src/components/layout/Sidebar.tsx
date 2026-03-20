import { ChevronRight } from 'lucide-react'

/**
 * Panel lateral del explorador de archivos.
 * Por ahora renderiza estructura placeholder.
 * Será reemplazado por un árbol virtualizado cuando se implemente el sistema de archivos.
 */
export default function Sidebar() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden select-none"
      style={{ backgroundColor: 'var(--cristal-bg-secondary)' }}
    >
      {/* Título de sección — replica el estilo de VS Code */}
      <div
        className="flex h-9 shrink-0 items-center px-5 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--cristal-text-secondary)' }}
      >
        Explorer
      </div>

      {/* Sección colapsable del workspace */}
      <div
        className="flex h-[22px] shrink-0 cursor-pointer items-center gap-0.5 px-2 text-[11px] font-bold uppercase"
        style={{ backgroundColor: 'var(--cristal-bg-tertiary)', color: 'var(--cristal-text-primary)' }}
      >
        <ChevronRight size={16} strokeWidth={1.5} />
        <span>CristalCE</span>
      </div>

      {/* Contenido placeholder — será reemplazado por árbol de archivos virtualizado */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <p
          className="px-4 py-8 text-center text-xs italic"
          style={{ color: 'var(--cristal-text-inactive)' }}
        >
          Sin carpeta abierta
        </p>
      </div>
    </div>
  )
}
