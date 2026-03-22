import { createContext, useContext, useReducer, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { configureTypeScriptForWorkspace, disposeTypeScript } from '../services/typescriptIntelligence'

/* ── Types ─────────────────────────────────────────────── */

export interface SavedTabInfo {
  filePath: string
  isActive: boolean
}

export interface PersistedWorkspaceState {
  openTabs: SavedTabInfo[]
  sidebarWidth?: number
  terminalOpen?: boolean
}

/* ── State ─────────────────────────────────────────────── */

interface WorkspaceState {
  /** Ruta de la carpeta abierta como workspace, o null si no hay carpeta abierta. */
  rootPath: string | null
  /** Nombre de la carpeta raíz para mostrar en el sidebar. */
  rootName: string
  /** Estado restaurado del workspace (tabs, layout). null si aún no se cargó. */
  restoredState: PersistedWorkspaceState | null
}

type WorkspaceAction =
  | { type: 'SET_ROOT'; rootPath: string }
  | { type: 'CLEAR_ROOT' }
  | { type: 'SET_RESTORED_STATE'; state: PersistedWorkspaceState }

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_ROOT': {
      const name = action.rootPath.replace(/\\/g, '/').split('/').pop() ?? action.rootPath
      return { rootPath: action.rootPath, rootName: name, restoredState: null }
    }
    case 'CLEAR_ROOT':
      return { rootPath: null, rootName: '', restoredState: null }
    case 'SET_RESTORED_STATE':
      return { ...state, restoredState: action.state }
    default:
      return state
  }
}

/* ── Context ───────────────────────────────────────────── */

type FileOpenCallback = (filePath: string) => void

interface WorkspaceContextValue {
  state: WorkspaceState
  openFolder: (rootPath: string) => void
  /** Sidebar llama esto para abrir un archivo en el editor. */
  requestOpenFile: (filePath: string) => void
  /** EditorArea registra su callback para recibir peticiones de apertura. */
  registerFileHandler: (cb: FileOpenCallback) => () => void
  /** Guarda el estado actual del workspace (tabs abiertos). */
  saveWorkspaceState: (wsState: PersistedWorkspaceState) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

/* ── Provider ──────────────────────────────────────────── */

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, { rootPath: null, rootName: '', restoredState: null })
  const fileHandlerRef = useRef<FileOpenCallback | null>(null)

  const openFolder = useCallback((rootPath: string) => {
    dispatch({ type: 'SET_ROOT', rootPath })
  }, [])

  // Cuando cambia el rootPath: restaurar estado + configurar TS intelligence
  useEffect(() => {
    if (!state.rootPath) {
      disposeTypeScript()
      return
    }

    const rootPath = state.rootPath

    // Registrar en recientes
    window.cristalAPI.settingsAddRecent(rootPath)

    // Restaurar estado del workspace
    window.cristalAPI.workspaceStateGet(rootPath).then((saved) => {
      if (saved && saved.openTabs?.length > 0) {
        dispatch({ type: 'SET_RESTORED_STATE', state: saved })
      }
    })

    // Configurar TypeScript intelligence
    configureTypeScriptForWorkspace(rootPath)

    // Iniciar watcher del filesystem
    window.cristalAPI.fsWatchStart(rootPath)

    return () => {
      disposeTypeScript()
      window.cristalAPI.fsWatchStop()
    }
  }, [state.rootPath])

  const requestOpenFile = useCallback((filePath: string) => {
    fileHandlerRef.current?.(filePath)
  }, [])

  const registerFileHandler = useCallback((cb: FileOpenCallback) => {
    fileHandlerRef.current = cb
    return () => {
      if (fileHandlerRef.current === cb) fileHandlerRef.current = null
    }
  }, [])

  const saveWorkspaceState = useCallback(async (wsState: PersistedWorkspaceState) => {
    if (!state.rootPath) return
    await window.cristalAPI.workspaceStateSet(state.rootPath, wsState)
  }, [state.rootPath])

  return (
    <WorkspaceContext.Provider value={{ state, openFolder, requestOpenFile, registerFileHandler, saveWorkspaceState }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
