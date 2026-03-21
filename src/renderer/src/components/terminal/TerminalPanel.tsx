/**
 * Panel de terminales integradas — tabs múltiples, toolbar con acciones.
 * Se renderiza en el panel inferior del layout principal.
 */

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Plus, X, Trash, ArrowsOutSimple } from '@phosphor-icons/react'
import TerminalInstance from './TerminalInstance'

/* ── Tipos ─────────────────────────────────────────────── */

interface TermTab {
  id: string       // ID de la sesión PTY
  label: string    // Nombre visible de la pestaña
}

interface TerminalPanelProps {
  /** Directorio de trabajo por defecto (workspace abierto) */
  cwd?: string
  /** Callback para ocultar el panel */
  onHide: () => void
}

/** Métodos expuestos al padre vía ref */
export interface TerminalPanelHandle {
  /** Escribe datos en la terminal activa (o crea una si no hay) */
  writeToActive: (data: string) => Promise<void>
}

/* ── Componente ────────────────────────────────────────── */

const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel({ cwd, onHide }, ref) {
  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const nextNum = useRef(1)

  // Crear terminal automáticamente al montar si no hay ninguna
  useEffect(() => {
    if (tabs.length === 0) {
      createTab()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createTab = useCallback(async () => {
    const id = await window.cristalAPI.terminalCreate({ cwd })
    if (!id) return
    const num = nextNum.current++
    const label = `Terminal ${num}`
    setTabs((prev) => [...prev, { id, label }])
    setActiveId(id)
  }, [cwd])

  const closeTab = useCallback(async (tabId: string) => {
    await window.cristalAPI.terminalDestroy(tabId)
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId)
      // Si cerramos la activa, activar la última disponible
      setActiveId((current) => {
        if (current !== tabId) return current
        return remaining.at(-1)?.id ?? null
      })
      return remaining
    })
  }, [])

  // Exponer writeToActive al padre (MainLayout)
  useImperativeHandle(ref, () => ({
    writeToActive: async (data: string) => {
      let target = activeId
      if (!target) {
        const id = await window.cristalAPI.terminalCreate({ cwd })
        if (!id) return
        const num = nextNum.current++
        setTabs((prev) => [...prev, { id, label: `Terminal ${num}` }])
        setActiveId(id)
        target = id
      }
      window.cristalAPI.terminalWrite(target, data)
    },
  }), [activeId, cwd])

  // Escuchar cuando muere un PTY externamente
  useEffect(() => {
    const unsub = window.cristalAPI.onTerminalExit((id) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id)
        setActiveId((current) => {
          if (current !== id) return current
          return remaining.at(-1)?.id ?? null
        })
        return remaining
      })
    })
    return unsub
  }, [])

  // Escuchar acciones del menú nativo "Terminal"
  useEffect(() => {
    const unsub = window.cristalAPI.onMenuAction((action) => {
      if (action === 'TERMINAL_NEW' || action === 'TERMINAL_SPLIT') {
        createTab()
      } else if (action === 'TERMINAL_CLOSE') {
        if (activeId) closeTab(activeId)
      } else if (action === 'TERMINAL_CLEAR') {
        // No hay API directa en xterm para clear vía IPC,
        // enviamos el comando clear/cls al PTY
        if (activeId) {
          const cmd = navigator.userAgent.includes('Windows') ? 'cls\r' : 'clear\r'
          window.cristalAPI.terminalWrite(activeId, cmd)
        }
      }
    })
    return unsub
  }, [createTab, closeTab, activeId])

  // Si no hay tabs, el panel no se renderiza
  if (tabs.length === 0) return null

  return (
    <div className="cristal-terminal">
      {/* Toolbar del panel */}
      <div className="cristal-terminal__toolbar">
        {/* Tabs */}
        <div className="cristal-terminal__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`cristal-terminal__tab${tab.id === activeId ? ' cristal-terminal__tab--active' : ''}`}
              onClick={() => setActiveId(tab.id)}
            >
              <span className="cristal-terminal__tab-label">{tab.label}</span>
              <span
                className="cristal-terminal__tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                <X size={10} weight="bold" />
              </span>
            </button>
          ))}
        </div>

        {/* Acciones */}
        <div className="cristal-terminal__actions">
          <button
            type="button"
            className="cristal-terminal__action-btn"
            onClick={createTab}
            title="Nueva terminal"
          >
            <Plus size={14} weight="bold" />
          </button>
          <button
            type="button"
            className="cristal-terminal__action-btn"
            onClick={() => {
              // Destruir todas las terminales
              tabs.forEach((t) => window.cristalAPI.terminalDestroy(t.id))
              setTabs([])
              setActiveId(null)
              onHide()
            }}
            title="Cerrar todas las terminales"
          >
            <Trash size={14} weight="bold" />
          </button>
          <button
            type="button"
            className="cristal-terminal__action-btn"
            onClick={onHide}
            title="Ocultar panel"
          >
            <ArrowsOutSimple size={14} weight="bold" style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
      </div>

      {/* Instancias de terminal */}
      <div className="cristal-terminal__body">
        {tabs.map((tab) => (
          <TerminalInstance
            key={tab.id}
            sessionId={tab.id}
            visible={tab.id === activeId}
          />
        ))}
      </div>
    </div>
  )
})

export default TerminalPanel
