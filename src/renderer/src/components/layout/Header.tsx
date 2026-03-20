/**
 * Cabecera personalizada premium de CristalCE.
 * Reemplaza visualmente el menú nativo con una barra compacta de 32px.
 * Opciones de menú simuladas (sin lógica) + logo cristalino centrado.
 * La región -webkit-app-region: drag permite arrastrar la ventana.
 */

const MENU_ITEMS = ['File', 'Edit', 'Selection', 'View', 'Go', 'Help'] as const

export default function Header() {
  return (
    <header
      className="flex h-8 shrink-0 items-center justify-between select-none"
      style={{
        backgroundColor: 'var(--cristal-bg-header)',
        borderBottom: '1px solid var(--cristal-border-subtle)',
        // Permite arrastrar la ventana desde la cabecera
        WebkitAppRegion: 'drag' as unknown as string,
      }}
    >
      {/* Izquierda: opciones de menú simuladas */}
      <div
        className="flex items-center gap-0.5 pl-2"
        style={{ WebkitAppRegion: 'no-drag' as unknown as string }}
      >
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            className="rounded px-2 py-0.5 text-[11.5px] transition-colors duration-75 hover:bg-[var(--cristal-bg-hover)]"
            style={{ color: 'var(--cristal-text-muted)' }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Centro: logo + nombre de la app */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        {/* Mini logo cristalino (hexágono) */}
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
          className="text-[11.5px] font-medium tracking-[0.08em]"
          style={{ color: 'var(--cristal-text-muted)' }}
        >
          CristalCE
        </span>
      </div>

      {/* Derecha: espacio reservado para controles de ventana (futuro) */}
      <div className="w-20" />
    </header>
  )
}
