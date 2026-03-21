import { useState, useCallback, useEffect, useRef } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import * as monaco from 'monaco-editor'
import Header from './Header'
import ActivityBar from './ActivityBar'
import Sidebar from './Sidebar'
import EditorArea from './EditorArea'
import StatusBar from './StatusBar'
import TerminalPanel, { type TerminalPanelHandle } from '../terminal/TerminalPanel'
import { useWorkspace } from '../../context/WorkspaceContext'

/* ── Altura mínima del panel de terminal (px) ──────────── */
const TERMINAL_MIN_H = 80
const TERMINAL_DEFAULT_H = 250

/**
 * Layout principal de CristalCE — identidad visual premium propia.
 * Estructura: Header → [ActivityBar | Sidebar (resize) | Editor + Terminal] → StatusBar.
 *
 * El split Editor/Terminal usa flex + drag manual (como VS Code)
 * para evitar el bug de pantalla negra al inyectar paneles dinámicos
 * dentro de react-resizable-panels.
 */
export default function MainLayout() {
  const [hasEditor, setHasEditor] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [terminalHeight, setTerminalHeight] = useState(TERMINAL_DEFAULT_H)
  const handleHasEditor = useCallback((v: boolean) => setHasEditor(v), [])
  const { state } = useWorkspace()

  const terminalRef = useRef<TerminalPanelHandle>(null)
  const activeFilePathRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const handleActiveFileChange = useCallback((fp: string | null) => {
    activeFilePathRef.current = fp
  }, [])

  // Toast temporal — se oculta automáticamente
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  /* ── Drag resize del separator terminal ──────────────── */
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const maxH = rect.height - TERMINAL_MIN_H
      const newH = Math.max(TERMINAL_MIN_H, rect.bottom - ev.clientY)
      setTerminalHeight(Math.min(newH, maxH))
    }

    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // Escuchar acciones de menú del Terminal
  useEffect(() => {
    const unsub = window.cristalAPI.onMenuAction((action) => {
      if (action === 'TERMINAL_NEW' || action === 'TERMINAL_SPLIT') {
        setShowTerminal(true)
      } else if (action === 'TERMINAL_RUN_FILE') {
        const fp = activeFilePathRef.current
        if (!fp) {
          showToast('No hay archivo activo para ejecutar')
          return
        }
        setShowTerminal(true)
        requestAnimationFrame(() => {
          terminalRef.current?.writeToActive(`node "${fp}"\r`)
        })
      } else if (action === 'TERMINAL_RUN_SELECTION') {
        const editors = monaco.editor.getEditors()
        const focused = editors.find((e) => e.hasTextFocus()) ?? editors[0]
        if (!focused) {
          showToast('No hay editor abierto')
          return
        }
        const selection = focused.getSelection()
        const model = focused.getModel()
        if (!selection || !model) {
          showToast('No hay texto seleccionado')
          return
        }
        const text = model.getValueInRange(selection)
        if (!text.trim()) {
          showToast('No hay texto seleccionado')
          return
        }
        setShowTerminal(true)
        requestAnimationFrame(() => {
          terminalRef.current?.writeToActive(text + '\r')
        })
      }
    })
    return unsub
  }, [showToast])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <div className="w-px shrink-0" style={{ backgroundColor: 'var(--cristal-border-subtle)' }} />

        <Group direction="horizontal">
          <Panel defaultSize="20%" minSize="15%" maxSize="40%" order={1}>
            <Sidebar />
          </Panel>

          <Separator className="cristal-resize-handle" />

          <Panel order={2}>
            {/* Contenedor flex vertical: Editor + Divider + Terminal */}
            <div ref={containerRef} className="cristal-editor-terminal-split">
              {/* Editor — ocupa todo el espacio restante */}
              <div className="cristal-editor-terminal-split__editor">
                <EditorArea onHasEditor={handleHasEditor} onActiveFileChange={handleActiveFileChange} />
              </div>

              {/* Divider arrastrable — solo visible cuando el terminal está abierto */}
              {showTerminal && (
                <div
                  className="cristal-editor-terminal-split__divider"
                  onMouseDown={onDragStart}
                />
              )}

              {/* Terminal — altura fija controlada por drag */}
              {showTerminal && (
                <div
                  className="cristal-editor-terminal-split__terminal"
                  style={{ height: terminalHeight }}
                >
                  <TerminalPanel
                    ref={terminalRef}
                    cwd={state.rootPath ?? undefined}
                    onHide={() => setShowTerminal(false)}
                  />
                </div>
              )}
            </div>
          </Panel>
        </Group>
      </div>

      {hasEditor && <StatusBar />}

      {toast && (
        <div className="cristal-toast">{toast}</div>
      )}
    </div>
  )
}
