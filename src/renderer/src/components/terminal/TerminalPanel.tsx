/**
 * Panel de terminales integradas — tabs múltiples, toolbar premium con
 * selector de shell (PowerShell / CMD / Custom), renombrado de pestañas
 * y acciones rápidas. Diseño inspirado en VS Code con identidad CristalCE.
 */

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Plus,
  X,
  Trash,
  ArrowsOutSimple,
  Terminal as TerminalIcon,
  CaretDown,
  PencilSimple,
  FolderOpen,
  Check,
} from '@phosphor-icons/react'
import TerminalInstance from './TerminalInstance'

/* ── Tipos de shell disponibles ────────────────────────── */

interface ShellProfile {
  id: string
  label: string
  shellPath: string
  shellArgs?: string[]
  icon?: string
}

const BUILTIN_SHELLS: ShellProfile[] =
  navigator.userAgent.includes('Windows')
    ? [
        { id: 'powershell', label: 'PowerShell', shellPath: 'powershell.exe' },
        { id: 'cmd', label: 'Command Prompt', shellPath: 'cmd.exe' },
      ]
    : [
        { id: 'bash', label: 'Bash', shellPath: '/bin/bash' },
        { id: 'zsh', label: 'Zsh', shellPath: '/bin/zsh' },
      ]

/* ── Tipos ─────────────────────────────────────────────── */

interface TermTab {
  id: string
  label: string
  shellLabel: string
}

interface TerminalPanelProps {
  cwd?: string
  onHide: () => void
}

export interface TerminalPanelHandle {
  writeToActive: (data: string) => Promise<void>
}

/* ── Componente ────────────────────────────────────────── */

const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel({ cwd, onHide }, ref) {
  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showShellPicker, setShowShellPicker] = useState(false)
  const [customShellPath, setCustomShellPath] = useState('')
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const nextNum = useRef(1)
  const shellPickerRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  /* ── Cerrar dropdown al hacer clic fuera ───────────── */
  useEffect(() => {
    if (!showShellPicker) return
    const handler = (e: MouseEvent) => {
      if (shellPickerRef.current && !shellPickerRef.current.contains(e.target as Node)) {
        setShowShellPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showShellPicker])

  /* ── Enfocar input de renombrado ────────────────────── */
  useEffect(() => {
    if (editingTabId) renameInputRef.current?.focus()
  }, [editingTabId])

  /* ── Crear terminal automáticamente al montar ──────── */
  useEffect(() => {
    if (tabs.length === 0) createTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createTab = useCallback(async (profile?: ShellProfile) => {
    setError(null)
    try {
      const opts: Record<string, unknown> = { cwd }
      if (profile) {
        opts.shellPath = profile.shellPath
        if (profile.shellArgs) opts.shellArgs = profile.shellArgs
      }
      const id = await window.cristalAPI.terminalCreate(opts as { cwd?: string; shellPath?: string; shellArgs?: string[] })
      if (!id) {
        setError('No se pudo crear la terminal. Verifica que las dependencias nativas estén instaladas.')
        return
      }
      const num = nextNum.current++
      const shellLabel = profile?.label ?? BUILTIN_SHELLS[0].label
      const label = `${shellLabel} ${num}`
      setTabs((prev) => [...prev, { id, label, shellLabel }])
      setActiveId(id)
      setShowShellPicker(false)
    } catch (err) {
      console.error('[TerminalPanel] Error al crear terminal:', err)
      setError('Error al inicializar la terminal. Revisa la consola para más detalles.')
    }
  }, [cwd])

  const createWithCustomPath = useCallback(async (shellPath: string) => {
    if (!shellPath.trim()) return
    const profile: ShellProfile = {
      id: 'custom',
      label: shellPath.split(/[\\/]/).pop() ?? 'Custom',
      shellPath: shellPath.trim(),
    }
    await createTab(profile)
  }, [createTab])

  const closeTab = useCallback(async (tabId: string) => {
    await window.cristalAPI.terminalDestroy(tabId)
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId)
      setActiveId((current) => {
        if (current !== tabId) return current
        return remaining.at(-1)?.id ?? null
      })
      return remaining
    })
  }, [])

  const renameTab = useCallback((tabId: string, newName: string) => {
    if (!newName.trim()) return
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, label: newName.trim() } : t)))
    setEditingTabId(null)
  }, [])

  const browseShell = useCallback(async () => {
    const path = await window.cristalAPI.terminalSelectShell()
    if (path) {
      setCustomShellPath(path)
      await createWithCustomPath(path)
    }
  }, [createWithCustomPath])

  /* ── Handle imperativo → writeToActive ─────────────── */
  useImperativeHandle(ref, () => ({
    writeToActive: async (data: string) => {
      let target = activeId
      if (!target) {
        const id = await window.cristalAPI.terminalCreate({ cwd })
        if (!id) return
        const num = nextNum.current++
        setTabs((prev) => [...prev, { id, label: `Terminal ${num}`, shellLabel: BUILTIN_SHELLS[0].label }])
        setActiveId(id)
        target = id
      }
      window.cristalAPI.terminalWrite(target, data)
    },
  }), [activeId, cwd])

  /* ── Escuchar PTY exit ─────────────────────────────── */
  useEffect(() => {
    const unsub = window.cristalAPI.onTerminalExit((id) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id)
        setActiveId((current) => (current !== id ? current : remaining.at(-1)?.id ?? null))
        return remaining
      })
    })
    return unsub
  }, [])

  /* ── Escuchar acciones del menú nativo ─────────────── */
  useEffect(() => {
    const unsub = window.cristalAPI.onMenuAction((action) => {
      if (action === 'TERMINAL_NEW' || action === 'TERMINAL_SPLIT') {
        createTab()
      } else if (action === 'TERMINAL_CLOSE') {
        if (activeId) closeTab(activeId)
      } else if (action === 'TERMINAL_CLEAR') {
        if (activeId) {
          const cmd = navigator.userAgent.includes('Windows') ? 'cls\r' : 'clear\r'
          window.cristalAPI.terminalWrite(activeId, cmd)
        }
      }
    })
    return unsub
  }, [createTab, closeTab, activeId])

  /* ── Estado vacío / error ──────────────────────────── */
  if (tabs.length === 0) {
    return (
      <div className="cristal-terminal">
        <div className="cristal-terminal__toolbar">
          <div className="cristal-terminal__toolbar-left">
            <TerminalIcon size={14} weight="bold" className="cristal-terminal__toolbar-icon" />
            <span className="cristal-terminal__toolbar-title">TERMINAL</span>
          </div>
          <div className="cristal-terminal__actions">
            <button type="button" className="cristal-terminal__action-btn" onClick={onHide} title="Ocultar panel">
              <ArrowsOutSimple size={14} weight="bold" style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
        </div>
        <div className="cristal-terminal__error">
          <span>{error ?? 'Creando terminal…'}</span>
          {error && (
            <button type="button" className="cristal-terminal__error-retry" onClick={() => createTab()}>
              Reintentar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="cristal-terminal">
      {/* ── Toolbar premium ────────────────────────────── */}
      <div className="cristal-terminal__toolbar">
        <div className="cristal-terminal__toolbar-left">
          <TerminalIcon size={14} weight="bold" className="cristal-terminal__toolbar-icon" />
          <span className="cristal-terminal__toolbar-title">TERMINAL</span>

          {/* Tabs */}
          <div className="cristal-terminal__tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`cristal-terminal__tab${tab.id === activeId ? ' cristal-terminal__tab--active' : ''}`}
                onClick={() => setActiveId(tab.id)}
              >
                {editingTabId === tab.id ? (
                  <input
                    ref={renameInputRef}
                    className="cristal-terminal__tab-rename"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => renameTab(tab.id, editingName)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameTab(tab.id, editingName)
                      if (e.key === 'Escape') setEditingTabId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="cristal-terminal__tab-label"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingTabId(tab.id)
                      setEditingName(tab.label)
                    }}
                    title="Doble clic para renombrar"
                  >
                    {tab.label}
                  </span>
                )}
                <span
                  className="cristal-terminal__tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <X size={10} weight="bold" />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="cristal-terminal__actions">
          {/* Renombrar terminal activa */}
          {activeId && !editingTabId && (
            <button
              type="button"
              className="cristal-terminal__action-btn"
              onClick={() => {
                const tab = tabs.find((t) => t.id === activeId)
                if (tab) {
                  setEditingTabId(tab.id)
                  setEditingName(tab.label)
                }
              }}
              title="Renombrar terminal"
            >
              <PencilSimple size={14} weight="bold" />
            </button>
          )}

          {/* Dropdown selector de shell */}
          <div className="cristal-terminal__shell-picker-container" ref={shellPickerRef}>
            <button
              type="button"
              className="cristal-terminal__action-btn cristal-terminal__new-btn"
              onClick={() => setShowShellPicker((v) => !v)}
              title="Nueva terminal — seleccionar shell"
            >
              <Plus size={14} weight="bold" />
              <CaretDown size={9} weight="bold" />
            </button>

            {showShellPicker && (
              <div className="cristal-terminal__shell-dropdown">
                <div className="cristal-terminal__shell-dropdown-header">Seleccionar perfil de shell</div>

                {BUILTIN_SHELLS.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    className="cristal-terminal__shell-option"
                    onClick={() => createTab(profile)}
                  >
                    <TerminalIcon size={14} weight="duotone" />
                    <span>{profile.label}</span>
                  </button>
                ))}

                <div className="cristal-terminal__shell-divider" />

                <div className="cristal-terminal__shell-custom">
                  <div className="cristal-terminal__shell-custom-label">Ruta personalizada</div>
                  <div className="cristal-terminal__shell-custom-row">
                    <input
                      type="text"
                      className="cristal-terminal__shell-custom-input"
                      placeholder="/ruta/al/shell o C:\..."
                      value={customShellPath}
                      onChange={(e) => setCustomShellPath(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createWithCustomPath(customShellPath)
                      }}
                    />
                    <button
                      type="button"
                      className="cristal-terminal__shell-custom-browse"
                      onClick={browseShell}
                      title="Examinar…"
                    >
                      <FolderOpen size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      className="cristal-terminal__shell-custom-go"
                      onClick={() => createWithCustomPath(customShellPath)}
                      title="Crear terminal con esta ruta"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="cristal-terminal__action-btn"
            onClick={() => {
              tabs.forEach((t) => window.cristalAPI.terminalDestroy(t.id))
              setTabs([])
              setActiveId(null)
              onHide()
            }}
            title="Cerrar todas las terminales"
          >
            <Trash size={14} weight="bold" />
          </button>
          <button type="button" className="cristal-terminal__action-btn" onClick={onHide} title="Ocultar panel">
            <ArrowsOutSimple size={14} weight="bold" style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
      </div>

      {/* ── Cuerpo — instancias xterm ──────────────────── */}
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
