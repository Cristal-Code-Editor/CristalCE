import { useState, useEffect } from 'react'
import { GitBranch, CheckCircle, HardDrives } from '@phosphor-icons/react'
import RuntimeModal from '../editor/RuntimeModal'

/**
 * Barra de estado inferior (22px) con fondo charcoal — identidad CristalCE.
 * Muestra info del sistema: rama Git, codificación, tipo de archivo.
 * Diseño premium: sin color de acento saturado, texto tenue sobre charcoal.
 */
export default function StatusBar() {
  const [showRuntime, setShowRuntime] = useState(false)
  const [activeLabel, setActiveLabel] = useState('')

  // Cargar label de la versión activa
  useEffect(() => {
    Promise.all([
      window.cristalAPI.runtimeGetActive(),
      window.cristalAPI.runtimeListInstalled(),
    ]).then(([activeVersion, installed]) => {
      const match = installed.find((i) => i.version === activeVersion)
      setActiveLabel(match?.label ?? 'Node.js')
    })
  }, [showRuntime]) // Refrescar al cerrar el modal

  return (
    <>
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
          <button
            type="button"
            onClick={() => setShowRuntime(true)}
            className="cristal-statusbar__runtime"
          >
            <HardDrives size={12} weight="light" />
            {activeLabel}
          </button>
          <span>TypeScript React</span>
        </div>
      </div>

      {showRuntime && <RuntimeModal onClose={() => setShowRuntime(false)} />}
    </>
  )
}
