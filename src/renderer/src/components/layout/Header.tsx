import { Minus, Square, X } from '@phosphor-icons/react'

const MENU_ITEMS = ['File', 'Edit', 'Selection', 'View', 'Go', 'Help'] as const

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function Header() {
  return (
    <header
      style={{
        display: 'flex',
        height: 36,
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--cristal-bg-header)',
        borderBottom: '1px solid var(--cristal-border-subtle)',
        userSelect: 'none',
        flexShrink: 0,
        WebkitAppRegion: 'drag' as any,
      }}
    >
      {/* Menú: cada botón despliega submenú nativo */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          paddingLeft: 8,
          WebkitAppRegion: 'no-drag' as any,
        }}
      >
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => window.cristalAPI.popupMenu(item)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--cristal-text-muted)',
              fontSize: 13,
              fontFamily: 'inherit',
              padding: '3px 8px',
              borderRadius: 4,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = 'var(--cristal-text-normal)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--cristal-text-muted)'
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Centro: logo + nombre */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 64 64" fill="none">
          <path
            d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
            stroke="var(--cristal-accent)"
            strokeWidth="3"
            strokeLinejoin="round"
            opacity={0.6}
          />
        </svg>
        <span style={{ fontSize: 11, color: 'var(--cristal-text-faint)', fontWeight: 500, letterSpacing: '0.08em' }}>
          CristalCE
        </span>
      </div>

      {/* Controles de ventana */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          WebkitAppRegion: 'no-drag' as any,
        }}
      >
        <WindowButton
          onClick={() => window.cristalAPI.windowMinimize()}
          label="Minimize"
          hoverBg="rgba(255,255,255,0.1)"
        >
          <Minus size={15} weight="regular" />
        </WindowButton>
        <WindowButton
          onClick={() => window.cristalAPI.windowMaximize()}
          label="Maximize"
          hoverBg="rgba(255,255,255,0.1)"
        >
          <Square size={13} weight="regular" />
        </WindowButton>
        <WindowButton
          onClick={() => window.cristalAPI.windowClose()}
          label="Close"
          hoverBg="rgba(220,38,38,0.85)"
          hoverColor="#fff"
        >
          <X size={15} weight="regular" />
        </WindowButton>
      </div>
    </header>
  )
}

function WindowButton({
  onClick,
  label,
  hoverBg,
  hoverColor,
  children,
}: {
  onClick: () => void
  label: string
  hoverBg: string
  hoverColor?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 46,
        height: '100%',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: 'var(--cristal-text-muted)',
        transition: 'background-color 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg
        if (hoverColor) e.currentTarget.style.color = hoverColor
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--cristal-text-muted)'
      }}
    >
      {children}
    </button>
  )
}
