import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen,
  Folder,
  FolderSimple,
  FileTs,
  FileJs,
  FileCss,
  FileHtml,
  FileText,
  FileCode,
  CaretRight,
  CaretDown,
  FilePlus,
  FolderPlus,
  ArrowClockwise,
  ArrowsInSimple,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { useWorkspace } from '../../context/WorkspaceContext'

/* ── File icon lookup ──────────────────────────────────── */

const FILE_ICONS: Record<string, { Icon: PhosphorIcon; color: string }> = {
  ts: { Icon: FileTs, color: '#3178c6' },
  tsx: { Icon: FileTs, color: '#3178c6' },
  js: { Icon: FileJs, color: '#f0db4f' },
  jsx: { Icon: FileJs, color: '#f0db4f' },
  css: { Icon: FileCss, color: '#563d7c' },
  scss: { Icon: FileCss, color: '#cd6799' },
  html: { Icon: FileHtml, color: '#e44d26' },
  htm: { Icon: FileHtml, color: '#e44d26' },
  json: { Icon: FileCode, color: '#f0db4f' },
  md: { Icon: FileText, color: '#519aba' },
  txt: { Icon: FileText, color: '#858585' },
}

function getFileIcon(name: string): { Icon: PhosphorIcon; color: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return FILE_ICONS[ext] ?? { Icon: FileCode, color: '#858585' }
}

/* ── DirEntry type (matches preload) ───────────────────── */

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
}

/* ── Inline creation input ─────────────────────────────── */

function InlineInput({
  type,
  onConfirm,
  onCancel,
}: {
  type: 'file' | 'folder'
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) onConfirm(trimmed)
    else onCancel()
  }

  const Icon = type === 'folder' ? FolderSimple : FileCode
  const iconColor = type === 'folder' ? 'var(--cristal-accent)' : '#858585'

  return (
    <div className="flex h-[22px] items-center gap-1.5 pr-2">
      <Icon size={14} weight="light" className="shrink-0" style={{ color: iconColor }} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={submit}
        className="h-[18px] min-w-0 flex-1 rounded-sm border px-1 text-[11px] outline-none"
        style={{
          backgroundColor: 'var(--cristal-bg-editor)',
          borderColor: 'var(--cristal-accent)',
          color: 'var(--cristal-text-normal)',
        }}
        spellCheck={false}
      />
    </div>
  )
}

/* ── Tree Node (controlled expand state) ───────────────── */

function TreeNode({
  entry,
  depth,
  expandedPaths,
  childrenCache,
  onToggle,
  onFileClick,
  creatingIn,
  onCreationDone,
}: {
  entry: DirEntry
  depth: number
  expandedPaths: Set<string>
  childrenCache: Map<string, DirEntry[]>
  onToggle: (path: string, shouldExpand: boolean) => void
  onFileClick: (filePath: string) => void
  creatingIn: { parentPath: string; type: 'file' | 'folder' } | null
  onCreationDone: () => void
}) {
  const expanded = expandedPaths.has(entry.path)
  const children = childrenCache.get(entry.path) ?? null
  const [loading, setLoading] = useState(false)

  const toggle = useCallback(async () => {
    if (!entry.isDirectory) {
      onFileClick(entry.path)
      return
    }

    if (expanded) {
      onToggle(entry.path, false)
      return
    }

    if (children === null) {
      setLoading(true)
      try {
        await onToggle(entry.path, true)
      } finally {
        setLoading(false)
      }
    } else {
      onToggle(entry.path, true)
    }
  }, [entry, expanded, children, onFileClick, onToggle])

  const FolderIcon = expanded ? FolderOpen : FolderSimple
  const { Icon: FileIcon, color } = entry.isDirectory
    ? { Icon: FolderIcon, color: 'var(--cristal-accent)' }
    : getFileIcon(entry.name)

  const isCreatingHere = creatingIn?.parentPath === entry.path

  const handleCreate = async (name: string) => {
    const newPath = entry.path + (entry.path.endsWith('/') || entry.path.endsWith('\\') ? '' : '/') + name
    try {
      if (creatingIn!.type === 'folder') {
        await window.cristalAPI.createDirectory(newPath)
      } else {
        await window.cristalAPI.createFile(newPath)
      }
    } catch {
      /* ignore — file might already exist */
    }
    onCreationDone()
  }

  return (
    <>
      <div
        onClick={toggle}
        className="flex h-[22px] cursor-pointer items-center gap-1.5 pr-2 text-[12px] hover:bg-white/5"
        style={{
          paddingLeft: `${12 + depth * 12}px`,
          color: entry.isDirectory ? 'var(--cristal-text-normal)' : 'var(--cristal-text-muted)',
        }}
      >
        {entry.isDirectory && (
          expanded ? (
            <CaretDown size={10} weight="bold" className="shrink-0" style={{ color: 'var(--cristal-text-muted)' }} />
          ) : (
            <CaretRight size={10} weight="bold" className="shrink-0" style={{ color: 'var(--cristal-text-muted)' }} />
          )
        )}
        {!entry.isDirectory && <span style={{ width: 10, flexShrink: 0 }} />}

        <FileIcon size={14} weight="light" className="shrink-0" style={{ color }} />
        <span className="truncate whitespace-nowrap">{entry.name}</span>

        {loading && (
          <span className="ml-auto text-[10px]" style={{ color: 'var(--cristal-text-faint)' }}>
            …
          </span>
        )}
      </div>

      {expanded && isCreatingHere && (
        <div style={{ paddingLeft: `${12 + (depth + 1) * 12}px` }}>
          <InlineInput
            type={creatingIn!.type}
            onConfirm={handleCreate}
            onCancel={onCreationDone}
          />
        </div>
      )}

      {expanded && children?.map((child) => (
        <TreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          childrenCache={childrenCache}
          onToggle={onToggle}
          onFileClick={onFileClick}
          creatingIn={creatingIn}
          onCreationDone={onCreationDone}
        />
      ))}
    </>
  )
}

/* ── Toolbar Button ────────────────────────────────────── */

function ToolbarButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: PhosphorIcon
  title: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-[20px] w-[20px] items-center justify-center rounded-[3px] hover:bg-white/10"
      style={{ color: 'var(--cristal-text-muted)' }}
    >
      <Icon size={14} weight="light" />
    </button>
  )
}

/* ── Sidebar ───────────────────────────────────────────── */

export default function Sidebar() {
  const { state, requestOpenFile } = useWorkspace()
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [childrenCache, setChildrenCache] = useState<Map<string, DirEntry[]>>(new Map())
  const [creatingIn, setCreatingIn] = useState<{ parentPath: string; type: 'file' | 'folder' } | null>(null)
  const [rootCollapsed, setRootCollapsed] = useState(false)

  // Cargar directorio raíz cuando cambia rootPath
  useEffect(() => {
    if (!state.rootPath) {
      setEntries([])
      setExpandedPaths(new Set())
      setChildrenCache(new Map())
      return
    }
    loadRoot()
  }, [state.rootPath])

  const loadRoot = useCallback(async () => {
    if (!state.rootPath) return
    try {
      const result = await window.cristalAPI.readDirectory(state.rootPath)
      setEntries(result)
    } catch {
      setEntries([])
    }
  }, [state.rootPath])

  const handleToggle = useCallback(async (path: string, shouldExpand: boolean) => {
    if (shouldExpand) {
      // Load children if not cached
      if (!childrenCache.has(path)) {
        const result = await window.cristalAPI.readDirectory(path)
        setChildrenCache((prev) => new Map(prev).set(path, result))
      }
      setExpandedPaths((prev) => new Set(prev).add(path))
    } else {
      setExpandedPaths((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
    }
  }, [childrenCache])

  const handleFileClick = useCallback(
    (filePath: string) => {
      requestOpenFile(filePath)
    },
    [requestOpenFile],
  )

  /* ── Toolbar actions ── */

  const handleNewFile = useCallback(() => {
    if (!state.rootPath) return
    // Find the first expanded folder, or use root
    const targetPath = state.rootPath
    setCreatingIn({ parentPath: targetPath, type: 'file' })
    // Ensure root is visible
    setRootCollapsed(false)
  }, [state.rootPath])

  const handleNewFolder = useCallback(() => {
    if (!state.rootPath) return
    const targetPath = state.rootPath
    setCreatingIn({ parentPath: targetPath, type: 'folder' })
    setRootCollapsed(false)
  }, [state.rootPath])

  const handleRefresh = useCallback(async () => {
    setChildrenCache(new Map())
    setExpandedPaths(new Set())
    await loadRoot()
  }, [loadRoot])

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set())
  }, [])

  const handleCreationDone = useCallback(async () => {
    const parentPath = creatingIn?.parentPath
    setCreatingIn(null)
    // Refresh the parent directory
    if (parentPath) {
      try {
        const result = await window.cristalAPI.readDirectory(parentPath)
        if (parentPath === state.rootPath) {
          setEntries(result)
        } else {
          setChildrenCache((prev) => new Map(prev).set(parentPath, result))
        }
      } catch {
        /* ignore */
      }
    }
  }, [creatingIn, state.rootPath])

  const toggleRootCollapsed = useCallback(() => {
    setRootCollapsed((prev) => !prev)
  }, [])

  return (
    <div
      className="flex h-full min-w-0 flex-col overflow-hidden select-none"
      style={{ backgroundColor: 'var(--cristal-bg-sidebar)' }}
    >
      {/* Título de sección */}
      <div className="flex h-8 shrink-0 items-center gap-2 px-3">
        <FolderOpen size={14} weight="light" className="shrink-0 text-[var(--cristal-accent)]" />
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--cristal-text-muted)]">
          Explorador
        </span>
      </div>

      {!state.rootPath ? (
        /* Sin carpeta abierta */
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <Folder size={32} weight="light" style={{ color: 'var(--cristal-text-faint)', marginBottom: 8 }} />
          <span className="text-[11px]" style={{ color: 'var(--cristal-text-faint)' }}>
            Abrí una carpeta para explorar archivos
          </span>
        </div>
      ) : (
        <>
          {/* Workspace header con toolbar */}
          <div
            className="group/header flex h-7 shrink-0 items-center gap-1 px-2 text-[11px] font-bold"
            style={{ backgroundColor: 'var(--cristal-bg-activitybar)', color: 'var(--cristal-text-normal)' }}
          >
            <div
              className="flex flex-1 cursor-pointer items-center gap-1 truncate"
              onClick={toggleRootCollapsed}
            >
              {rootCollapsed ? (
                <CaretRight size={12} weight="bold" className="shrink-0" />
              ) : (
                <CaretDown size={12} weight="bold" className="shrink-0" />
              )}
              <span className="truncate">{state.rootName.toUpperCase()}</span>
            </div>

            {/* Action buttons — visible on hover */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/header:opacity-100">
              <ToolbarButton icon={FilePlus} title="Nuevo archivo" onClick={handleNewFile} />
              <ToolbarButton icon={FolderPlus} title="Nueva carpeta" onClick={handleNewFolder} />
              <ToolbarButton icon={ArrowClockwise} title="Refrescar explorador" onClick={handleRefresh} />
              <ToolbarButton icon={ArrowsInSimple} title="Colapsar carpetas" onClick={handleCollapseAll} />
            </div>
          </div>

          {/* Árbol de archivos real */}
          {!rootCollapsed && (
            <div className="flex-1 overflow-y-auto py-1">
              {/* Inline creation at root level */}
              {creatingIn?.parentPath === state.rootPath && (
                <div style={{ paddingLeft: '12px' }}>
                  <InlineInput
                    type={creatingIn.type}
                    onConfirm={async (name) => {
                      const newPath = state.rootPath + (state.rootPath!.endsWith('/') || state.rootPath!.endsWith('\\') ? '' : '/') + name
                      try {
                        if (creatingIn.type === 'folder') {
                          await window.cristalAPI.createDirectory(newPath)
                        } else {
                          await window.cristalAPI.createFile(newPath)
                        }
                      } catch { /* ignore */ }
                      handleCreationDone()
                    }}
                    onCancel={() => setCreatingIn(null)}
                  />
                </div>
              )}

              {entries.map((entry) => (
                <TreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  expandedPaths={expandedPaths}
                  childrenCache={childrenCache}
                  onToggle={handleToggle}
                  onFileClick={handleFileClick}
                  creatingIn={creatingIn}
                  onCreationDone={handleCreationDone}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
