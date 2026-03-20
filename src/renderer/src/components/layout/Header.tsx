import { Minus, Square, X } from '@phosphor-icons/react'

/**
 * Cabecera personalizada premium de CristalCE.
 * Barra compacta de 32px: menú nativo vía IPC, logo centrado, controles de ventana.
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
      {/* Izquierda: menú — cada botón despliega su submenú nativo via IPC */}
      <div
        className="flex items-center pl-1"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => window.cristalAPI.popupMenu(item)}
            className="rounded px-2.5 py-0.5 text-[12px] text-[var(--cristal-text-muted)] transition-colors duration-75 hover:bg-white/7 hover:text-[var(--cristal-text-normal)]"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Centro: logo + nombre de la app */}
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 64 64"
          fill="none"
          className="text-[var(--cristal-accent)] opacity-60"
        >
          <path
            d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-medium tracking-[0.08em] text-[var(--cristal-text-faint)]">
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
          className="flex h-full w-[46px] items-center justify-center text-[var(--cristal-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--cristal-text-normal)]"
          aria-label="Minimize"
        >
          <Minus size={15} weight="regular" />
        </button>
        <button
          onClick={() => window.cristalAPI.windowMaximize()}
          className="flex h-full w-[46px] items-center justify-center text-[var(--cristal-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--cristal-text-normal)]"
          aria-label="Maximize"
        >
          <Square size={13} weight="regular" />
        </button>
        <button
          onClick={() => window.cristalAPI.windowClose()}
          className="flex h-full w-[46px] items-center justify-center text-[var(--cristal-text-muted)] transition-colors hover:bg-red-600/90 hover:text-white"
          aria-label="Close"
        >
          <X size={15} weight="regular" />
        </button>
      </div>
    </header>
  )
}
