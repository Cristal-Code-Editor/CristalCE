import { useRef, useEffect, useCallback } from 'react'
import { X, Trash } from '@phosphor-icons/react'

/* ── Tipos de línea de output ──────────────────────────── */

export interface OutputLine {
  type: 'stdout' | 'stderr' | 'info'
  text: string
}

/* ── Props ─────────────────────────────────────────────── */

interface OutputPanelProps {
  lines: OutputLine[]
  running: boolean
  onClear: () => void
  onClose: () => void
  onStop: () => void
}

/* ── Componente ────────────────────────────────────────── */

export default function OutputPanel({ lines, running, onClear, onClose, onStop }: OutputPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final con cada nueva línea
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const handleStop = useCallback(() => {
    onStop()
  }, [onStop])

  return (
    <div className="cristal-output">
      {/* Cabecera */}
      <div className="cristal-output__header">
        <span className="cristal-output__title">
          Output
          {running && <span className="cristal-output__badge">ejecutando</span>}
        </span>

        <div className="cristal-output__actions">
          {running && (
            <button type="button" onClick={handleStop} className="cristal-output__action-btn cristal-output__stop-btn">
              Detener
            </button>
          )}
          <button type="button" onClick={onClear} className="cristal-output__action-btn" title="Limpiar">
            <Trash size={12} weight="bold" />
          </button>
          <button type="button" onClick={onClose} className="cristal-output__action-btn" title="Cerrar">
            <X size={12} weight="bold" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div ref={scrollRef} className="cristal-output__body">
        {lines.length === 0 && (
          <span className="cristal-output__empty">Ejecuta código para ver resultados aquí…</span>
        )}
        {lines.map((line, i) => (
          <pre
            key={i}
            className={`cristal-output__line ${
              line.type === 'stderr' ? 'cristal-output__line--error' :
              line.type === 'info' ? 'cristal-output__line--info' : ''
            }`}
          >{line.text}</pre>
        ))}
      </div>
    </div>
  )
}
