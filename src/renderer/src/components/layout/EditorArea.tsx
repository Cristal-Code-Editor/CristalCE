import { useReducer, useCallback } from 'react'
import EditorPane, { type TabData } from '../editor/EditorPane'

/* ── Demo content ──────────────────────────────────────── */

const DEMO_TSX = `import { useState, useEffect } from 'react'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users')
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export default function UserDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p>Cargando…</p>

  return (
    <section className="dashboard">
      <h1>Users ({filtered.length})</h1>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      <ul>
        {filtered.map((user) => (
          <li key={user.id}>
            <span className="name">{user.name}</span>
            <span className="role">{user.role}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
`

const DEMO_CSS = `/* CristalCE — Component Styles */

:root {
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dashboard {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #00e5ff, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dashboard input[type="search"] {
  width: 100%;
  padding: 0.625rem 1rem;
  border: 1px solid var(--cristal-border);
  border-radius: var(--radius);
  background: var(--cristal-bg-sidebar);
  color: var(--cristal-text-normal);
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition);
}

.dashboard input[type="search"]:focus {
  border-color: var(--cristal-accent);
}

.dashboard ul {
  list-style: none;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dashboard li {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background: var(--cristal-bg-hover);
  transition: transform var(--transition);
}

.dashboard li:hover {
  transform: translateX(4px);
}

/* Animations */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard li {
  animation: fade-in 0.3s ease both;
}
`

/* ── State ─────────────────────────────────────────────── */

interface EditorState {
  tabs: TabData[]
  activeTabId: string | null
}

type Action =
  | { type: 'SELECT_TAB'; id: string }
  | { type: 'CLOSE_TAB'; id: string }
  | { type: 'UPDATE_CONTENT'; id: string; content: string }
  | { type: 'SAVE'; id: string }

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

    case 'SAVE':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.id ? { ...t, savedContent: t.content } : t,
        ),
      }

    default:
      return state
  }
}

const INITIAL_STATE: EditorState = {
  tabs: [
    {
      id: '1',
      fileName: 'Dashboard.tsx',
      language: 'typescriptreact',
      content: DEMO_TSX,
      savedContent: DEMO_TSX,
    },
    {
      id: '2',
      fileName: 'styles.css',
      language: 'css',
      content: DEMO_CSS,
      savedContent: DEMO_CSS,
    },
  ],
  activeTabId: '1',
}

/* ── Component ─────────────────────────────────────────── */

export default function EditorArea() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const handleTabSelect = useCallback((id: string) => dispatch({ type: 'SELECT_TAB', id }), [])
  const handleTabClose = useCallback((id: string) => dispatch({ type: 'CLOSE_TAB', id }), [])
  const handleContentChange = useCallback(
    (id: string, content: string) => dispatch({ type: 'UPDATE_CONTENT', id, content }),
    [],
  )
  const handleSave = useCallback((id: string) => dispatch({ type: 'SAVE', id }), [])

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
