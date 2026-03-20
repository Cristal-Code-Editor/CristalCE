import { Minus, Square, X } from '@phosphor-icons/react'

/**
 * Cabecera personalizada premium de CristalCE.
 * Barra compacta de 32px con menú simulado, logo centrado y controles de ventana.
 * -webkit-app-region: drag permite arrastrar la ventana desde la cabecera.
 */

const MENU_ITEMS = ['File', 'Edit', 'Selection', 'View', 'Go', 'Help'] as const

export default function Header() {
  return (
    <header
      className="flex h-8 shrink-0 items-center justify-between select-none"
      style={{
        backgroundColor: 'var(--cristal-bg-header)',
        borderBottom: '1px solid var(--cristal-border-subtle)',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        WebkitAppRegion: 'drag' as any,
      }}
    >
      {/* Izquierda: opciones de menú simuladas */}
      <div
        className="flex items-center gap-4 pl-2"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            className="rounded px-2 py-1 text-sm text-[var(--cristal-text-muted)] transition-colors duration-75 hover:bg-white/5 hover:text-[var(--cristal-text-normal)]"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Centro: logo + nombre de la app */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 64 64"
          fill="none"
          className="text-[var(--cristal-accent)] opacity-70"
        >
          <path
            d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="text-[11.5px] font-medium tracking-[0.08em] text-[var(--cristal-text-muted)]"
        >
          CristalCE
        </span>
      </div>

      {/* Derecha: controles de ventana */}
      <div
        className="flex h-full items-center"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        <button
          onClick={() => window.cristalAPI.windowMinimize()}
          className="flex h-full w-12 items-center justify-center text-[var(--cristal-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--cristal-text-normal)]"
          aria-label="Minimize"
        >
          <Minus size={16} weight="light" />
        </button>
        <button
          onClick={() => window.cristalAPI.windowMaximize()}
          className="flex h-full w-12 items-center justify-center text-[var(--cristal-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--cristal-text-normal)]"
          aria-label="Maximize"
        >
          <Square size={14} weight="light" />
        </button>
        <button
          onClick={() => window.cristalAPI.windowClose()}
          className="flex h-full w-12 items-center justify-center text-[var(--cristal-text-muted)] transition-colors hover:bg-red-500 hover:text-white"
          aria-label="Close"
        >
          <X size={16} weight="light" />
        </button>
      </div>
    </header>
  )
}
