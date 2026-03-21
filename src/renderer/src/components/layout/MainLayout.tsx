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
  const handleHasEditor = useCallback((v: boolean) => setHasEditor(v), [])
  const { state } = useWorkspace()

  const terminalRef = useRef<TerminalPanelHandle>(null)
  const activeFilePathRef = useRef<string | null>(null)

  const handleActiveFileChange = useCallback((fp: string | null) => {
    activeFilePathRef.current = fp
  }, [])

  // Escuchar acciones de menú del Terminal
  useEffect(() => {
    const unsub = window.cristalAPI.onMenuAction((action) => {
      if (action === 'TERMINAL_NEW' || action === 'TERMINAL_SPLIT') {
        setShowTerminal(true)
      } else if (action === 'TERMINAL_RUN_FILE') {
        const fp = activeFilePathRef.current
        if (!fp) return
        setShowTerminal(true)
        // Pequeño delay para que el panel se monte si no estaba visible
        requestAnimationFrame(() => {
          terminalRef.current?.writeToActive(`node "${fp}"\r`)
        })
      } else if (action === 'TERMINAL_RUN_SELECTION') {
        // Obtener texto seleccionado del editor Monaco activo
        const editors = monaco.editor.getEditors()
        const focused = editors.find((e) => e.hasTextFocus()) ?? editors[0]
        const selection = focused?.getSelection()
        const model = focused?.getModel()
        if (!selection || !model) return
        const text = model.getValueInRange(selection)
        if (!text.trim()) return
        setShowTerminal(true)
        requestAnimationFrame(() => {
          terminalRef.current?.writeToActive(text + '\r')
        })
      }
    })
    return unsub
  }, [])

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
              <Panel order={1} minSize="20%">
                <EditorArea onHasEditor={handleHasEditor} onActiveFileChange={handleActiveFileChange} />
              </Panel>

              {showTerminal && (
                <>
                  <Separator className="cristal-resize-handle cristal-resize-handle--horizontal" />
                  <Panel order={2} defaultSize="35%" minSize="10%" maxSize="80%">
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
    </div>
  )
}
