import { useReducer, useCallback, useEffect } from 'react'
import EditorPane, { type TabData } from '../editor/EditorPane'
import { detectLanguage, fileNameFromPath } from '../../utils/languageMap'
import { useWorkspace } from '../../context/WorkspaceContext'

/* ── State ─────────────────────────────────────────────── */

interface EditorState {
  tabs: TabData[]
  activeTabId: string | null
}

type Action =
  | { type: 'SELECT_TAB'; id: string }
  | { type: 'CLOSE_TAB'; id: string }
  | { type: 'UPDATE_CONTENT'; id: string; content: string }
  | { type: 'MARK_SAVED'; id: string; filePath?: string }
  | { type: 'OPEN_FILE'; filePath: string; content: string }
  | { type: 'NEW_FILE' }

let nextId = 1

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SELECT_TAB':
      return { ...state, activeTabId: action.id }

    case 'CLOSE_TAB': {
      const idx = state.tabs.findIndex((t) => t.id === action.id)
      const tabs = state.tabs.filter((t) => t.id !== action.id)
      let { activeTabId } = state

      if (activeTabId === action.id) {
        activeTabId = tabs.length > 0 ? tabs[Math.min(idx, tabs.length - 1)].id : null
      }
      return { tabs, activeTabId }
    }

    case 'UPDATE_CONTENT':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.id ? { ...t, content: action.content } : t,
        ),
      }

    case 'MARK_SAVED':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.id
            ? {
                ...t,
                savedContent: t.content,
                filePath: action.filePath ?? t.filePath,
                fileName: action.filePath ? fileNameFromPath(action.filePath) : t.fileName,
                language: action.filePath ? detectLanguage(fileNameFromPath(action.filePath)) : t.language,
              }
            : t,
        ),
      }

    case 'OPEN_FILE': {
      // Si el archivo ya está abierto, activar esa pestaña
      const existing = state.tabs.find((t) => t.filePath === action.filePath)
      if (existing) {
        return { ...state, activeTabId: existing.id }
      }

      const fileName = fileNameFromPath(action.filePath)
      const language = detectLanguage(fileName)
      const id = `file-${nextId++}`
      const tab: TabData = {
        id,
        fileName,
        language,
        content: action.content,
        savedContent: action.content,
        filePath: action.filePath,
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabId: id,
      }
    }

    case 'NEW_FILE': {
      const id = `untitled-${nextId++}`
      const tab: TabData = {
        id,
        fileName: `Sin título-${nextId}`,
        language: 'plaintext',
        content: '',
        savedContent: '',
        filePath: null,
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabId: id,
      }
    }

    default:
      return state
  }
}

const INITIAL_STATE: EditorState = {
  tabs: [],
  activeTabId: null,
}

/* ── Component ─────────────────────────────────────────── */

export default function EditorArea() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const { registerFileHandler } = useWorkspace()

  // ── Registrar handler para apertura de archivos desde Sidebar ──
  const openFileFromPath = useCallback(async (filePath: string) => {
    try {
      const content = await window.cristalAPI.readFile(filePath)
      dispatch({ type: 'OPEN_FILE', filePath, content })
    } catch (err) {
      console.error('[EditorArea] Error reading file:', err)
    }
  }, [])

  useEffect(() => {
    return registerFileHandler(openFileFromPath)
  }, [registerFileHandler, openFileFromPath])

  // ── IPC: Abrir archivo desde menú ─────────────────────
  useEffect(() => {
    const unsubFile = window.cristalAPI.onFileOpen(async (filePath) => {
      try {
        const content = await window.cristalAPI.readFile(filePath)
        dispatch({ type: 'OPEN_FILE', filePath, content })
      } catch (err) {
        console.error('[EditorArea] Error reading file:', err)
      }
    })

    const unsubMenu = window.cristalAPI.onMenuAction((action) => {
      switch (action) {
        case 'FILE_NEW':
          dispatch({ type: 'NEW_FILE' })
          break
        case 'FILE_SAVE':
          handleSaveActive()
          break
        case 'FILE_SAVE_AS':
          handleSaveAsActive()
          break
        case 'FILE_CLOSE_EDITOR':
          if (state.activeTabId) dispatch({ type: 'CLOSE_TAB', id: state.activeTabId })
          break
      }
    })

    return () => {
      unsubFile()
      unsubMenu()
    }
  }) // Re-subscribe on every render to capture current state.activeTabId

  // ── Save helpers ──────────────────────────────────────
  const saveTab = useCallback(async (tab: TabData) => {
    if (tab.filePath) {
      await window.cristalAPI.writeFile(tab.filePath, tab.content)
      dispatch({ type: 'MARK_SAVED', id: tab.id })
    } else {
      // Archivo nuevo → pedir ruta con "Guardar como"
      const chosenPath = await window.cristalAPI.showSaveDialog()
      if (chosenPath) {
        await window.cristalAPI.writeFile(chosenPath, tab.content)
        dispatch({ type: 'MARK_SAVED', id: tab.id, filePath: chosenPath })
      }
    }
  }, [])

  const handleSaveActive = useCallback(() => {
    const tab = state.tabs.find((t) => t.id === state.activeTabId)
    if (tab) saveTab(tab)
  }, [state.tabs, state.activeTabId, saveTab])

  const handleSaveAsActive = useCallback(async () => {
    const tab = state.tabs.find((t) => t.id === state.activeTabId)
    if (!tab) return
    const chosenPath = await window.cristalAPI.showSaveDialog(tab.filePath ?? undefined)
    if (chosenPath) {
      await window.cristalAPI.writeFile(chosenPath, tab.content)
      dispatch({ type: 'MARK_SAVED', id: tab.id, filePath: chosenPath })
    }
  }, [state.tabs, state.activeTabId])

  // ── Callbacks for EditorPane ──────────────────────────
  const handleTabSelect = useCallback((id: string) => dispatch({ type: 'SELECT_TAB', id }), [])
  const handleTabClose = useCallback((id: string) => dispatch({ type: 'CLOSE_TAB', id }), [])
  const handleContentChange = useCallback(
    (id: string, content: string) => dispatch({ type: 'UPDATE_CONTENT', id, content }),
    [],
  )
  const handleSave = useCallback(
    (id: string) => {
      const tab = state.tabs.find((t) => t.id === id)
      if (tab) saveTab(tab)
    },
    [state.tabs, saveTab],
  )

  return (
    <EditorPane
      tabs={state.tabs}
      activeTabId={state.activeTabId}
      onTabSelect={handleTabSelect}
      onTabClose={handleTabClose}
      onContentChange={handleContentChange}
      onSave={handleSave}
    />
  )
}
