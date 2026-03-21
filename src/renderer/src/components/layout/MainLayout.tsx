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

/**
 * Layout principal de CristalCE — identidad visual premium propia.
 * Estructura: Header → [ActivityBar | Sidebar (resize) | Editor + Terminal] → StatusBar.
 * Paneles redimensionables con persistencia en localStorage.
 */
export default function MainLayout() {
  const [hasEditor, setHasEditor] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const handleHasEditor = useCallback((v: boolean) => setHasEditor(v), [])
  const { state } = useWorkspace()

  const terminalRef = useRef<TerminalPanelHandle>(null)
  const activeFilePathRef = useRef<string | null>(null)

  const handleActiveFileChange = useCallback((fp: string | null) => {
    activeFilePathRef.current = fp
  }, [])

  // Toast temporal — se oculta automáticamente
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
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
      {/* Header — cabecera personalizada con menú simulado y logo */}
      <Header />

      {/* Zona principal: ActivityBar + Paneles redimensionables */}
      <div className="flex flex-1 overflow-hidden">
        {/* ActivityBar — ancho fijo 48px, fuera del sistema de paneles */}
        <ActivityBar />

        {/* Separador vertical sutil entre ActivityBar y Sidebar */}
        <div className="w-px shrink-0" style={{ backgroundColor: 'var(--cristal-border-subtle)' }} />

        {/* Group horizontal: Sidebar redimensionable + Editor */}
        <Group direction="horizontal">
          <Panel
            defaultSize="20%"
            minSize="15%"
            maxSize="40%"
            order={1}
          >
            <Sidebar />
          </Panel>

          {/* Separator — franja visible y arrastrable con hover cian */}
          <Separator className="cristal-resize-handle" />

          <Panel order={2}>
            {/* Group vertical: Editor arriba, Terminal abajo */}
            <Group direction="vertical">
              <Panel id="editor-main" order={1} minSize="20%">
                <EditorArea onHasEditor={handleHasEditor} onActiveFileChange={handleActiveFileChange} />
              </Panel>

              {showTerminal && (
                <>
                  <Separator className="cristal-resize-handle cristal-resize-handle--horizontal" />
                  <Panel id="terminal-main" order={2} defaultSize="35%" minSize="10%" maxSize="80%">
                    <TerminalPanel
                      ref={terminalRef}
                      cwd={state.rootPath ?? undefined}
                      onHide={() => setShowTerminal(false)}
                    />
                  </Panel>
                </>
              )}
            </Group>
          </Panel>
        </Group>
      </div>

      {/* StatusBar — solo visible cuando hay editor activo */}
      {hasEditor && <StatusBar />}

      {/* Toast de advertencia */}
      {toast && (
        <div className="cristal-toast">{toast}</div>
      )}
    </div>
  )
}
