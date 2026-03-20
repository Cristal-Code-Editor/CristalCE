import { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from 'react'

/* ── State ─────────────────────────────────────────────── */

interface WorkspaceState {
  /** Ruta de la carpeta abierta como workspace, o null si no hay carpeta abierta. */
  rootPath: string | null
  /** Nombre de la carpeta raíz para mostrar en el sidebar. */
  rootName: string
}

type WorkspaceAction =
  | { type: 'SET_ROOT'; rootPath: string }
  | { type: 'CLEAR_ROOT' }

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_ROOT': {
      const name = action.rootPath.replace(/\\/g, '/').split('/').pop() ?? action.rootPath
      return { rootPath: action.rootPath, rootName: name }
    }
    case 'CLEAR_ROOT':
      return { rootPath: null, rootName: '' }
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
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

/* ── Provider ──────────────────────────────────────────── */

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, { rootPath: null, rootName: '' })
  const fileHandlerRef = useRef<FileOpenCallback | null>(null)

  const openFolder = useCallback((rootPath: string) => {
    dispatch({ type: 'SET_ROOT', rootPath })
  }, [])

  const requestOpenFile = useCallback((filePath: string) => {
    fileHandlerRef.current?.(filePath)
  }, [])

  const registerFileHandler = useCallback((cb: FileOpenCallback) => {
    fileHandlerRef.current = cb
    return () => {
      if (fileHandlerRef.current === cb) fileHandlerRef.current = null
    }
  }, [])

  return (
    <WorkspaceContext.Provider value={{ state, openFolder, requestOpenFile, registerFileHandler }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
