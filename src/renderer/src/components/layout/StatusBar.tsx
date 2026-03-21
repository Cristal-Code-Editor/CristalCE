/**
 * Barra de estado inferior (22px) — solo línea y columna.
 * Visible únicamente cuando hay un editor activo.
 */
export default function StatusBar() {
  return (
    <div
      className="flex h-[22px] shrink-0 items-center justify-end px-3 text-[11px] select-none"
      style={{
        backgroundColor: 'var(--cristal-bg-statusbar)',
        borderTop: '1px solid var(--cristal-border-subtle)',
        color: 'var(--cristal-text-muted)',
      }}
    >
      <span>Ln 1, Col 1</span>
    </div>
  )
}
