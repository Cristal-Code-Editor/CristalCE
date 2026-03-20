/**
 * Barra de estado inferior (22px).
 * Muestra información del sistema: rama Git, tipo de archivo, codificación.
 * Replica el estilo azul/púrpura de VS Code con texto pequeño.
 */
export default function StatusBar() {
  return (
    <div
      className="flex h-[22px] shrink-0 items-center justify-between px-2.5 text-[12px] select-none"
      style={{
        backgroundColor: 'var(--cristal-bg-statusbar)',
        color: '#ffffff',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="font-medium">CristalCE</span>
      </div>
      <div className="flex items-center gap-3">
        <span>UTF-8</span>
        <span>LF</span>
        <span>TypeScript</span>
      </div>
    </div>
  )
}
