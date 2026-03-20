import { GitBranch, CheckCircle } from '@phosphor-icons/react'

/**
 * Barra de estado inferior (22px) con fondo charcoal — identidad CristalCE.
 * Muestra info del sistema: rama Git, codificación, tipo de archivo.
 * Diseño premium: sin color de acento saturado, texto tenue sobre charcoal.
 */
export default function StatusBar() {
  return (
    <div
      className="flex h-[22px] shrink-0 items-center justify-between px-3 text-[11px] select-none"
      style={{
        backgroundColor: 'var(--cristal-bg-statusbar)',
        borderTop: '1px solid var(--cristal-border-subtle)',
        color: 'var(--cristal-text-muted)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <GitBranch size={13} weight="light" />
          main
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle size={13} weight="light" />
          0 problemas
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>Ln 1, Col 1</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>TypeScript React</span>
      </div>
    </div>
  )
}
