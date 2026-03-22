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

/* ── helpers ───────────────────────────────────────────── */

/** Extrae el nombre del directorio padre de una ruta. */
function parentDir(p: string): string {
  const sep = p.includes('/') ? '/' : '\\'
  return p.substring(0, p.lastIndexOf(sep))
}

/** Construye una ruta hija dentro de un directorio. */
function childPath(dir: string, name: string): string {
  const sep = dir.includes('/') ? '/' : '\\'
  return dir.endsWith(sep) ? dir + name : dir + sep + name
}

/* ── Inline Input (create / rename) ────────────────────── */

function InlineInput({
  type,
  initialValue,
  onConfirm,
  onCancel,
}: {
  type: 'file' | 'folder' | 'rename'
  initialValue?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue ?? '')

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    // Si es rename, seleccionar el nombre sin extensión
    if (initialValue) {
      const dotIdx = initialValue.lastIndexOf('.')
      el.setSelectionRange(0, dotIdx > 0 ? dotIdx : initialValue.length)
    }
  }, [initialValue])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initialValue) onConfirm(trimmed)
    else onCancel()
  }

  const Icon = type === 'folder' ? FolderSimple : FileCode
  const iconColor = type === 'folder' ? 'var(--cristal-accent)' : '#858585'

  return (
    <div className="flex h-[22px] items-center gap-1.5 pr-2">
      {type !== 'rename' && (
        <Icon size={14} weight="light" className="shrink-0" style={{ color: iconColor }} />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onCancel()
          e.stopPropagation()
        }}
        onBlur={submit}
        onClick={(e) => e.stopPropagation()}
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

/* ── Drag ghost data type ──────────────────────────────── */
const DRAG_MIME = 'application/x-cristal-tree-path'

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
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
  onContextMenu,
  onDrop,
  selectedPath,
}: {
  entry: DirEntry
  depth: number
  expandedPaths: Set<string>
  childrenCache: Map<string, DirEntry[]>
  onToggle: (path: string, shouldExpand: boolean) => void
  onFileClick: (filePath: string) => void
  creatingIn: { parentPath: string; type: 'file' | 'folder' } | null
  onCreationDone: () => void
  renamingPath: string | null
  onRenameConfirm: (oldPath: string, newName: string) => void
  onRenameCancel: () => void
  onContextMenu: (e: React.MouseEvent, entry: DirEntry) => void
  onDrop: (sourcePath: string, destDir: string) => void
  selectedPath: string | null
}) {
  const expanded = expandedPaths.has(entry.path)
  const children = childrenCache.get(entry.path) ?? null
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const isRenaming = renamingPath === entry.path

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
  const isSelected = selectedPath === entry.path

  const handleCreate = async (name: string) => {
    const newPath = childPath(entry.path, name)
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

  /* ── Drag & Drop ── */
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, entry.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!entry.isDirectory) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const sourcePath = e.dataTransfer.getData(DRAG_MIME)
    if (sourcePath && sourcePath !== entry.path && entry.isDirectory) {
      onDrop(sourcePath, entry.path)
    }
  }

  const paddingLeft = `${12 + depth * 12}px`

  if (isRenaming) {
    return (
      <div style={{ paddingLeft }} className="pr-2">
        <div className="flex h-[22px] items-center gap-1.5">
          <FileIcon size={14} weight="light" className="shrink-0" style={{ color }} />
          <InlineInput
            type="rename"
            initialValue={entry.name}
            onConfirm={(newName) => onRenameConfirm(entry.path, newName)}
            onCancel={onRenameCancel}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        onClick={toggle}
        onContextMenu={(e) => onContextMenu(e, entry)}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex h-[22px] cursor-pointer items-center gap-1.5 pr-2 text-[12px] hover:bg-white/5"
        style={{
          paddingLeft,
          color: entry.isDirectory ? 'var(--cristal-text-normal)' : 'var(--cristal-text-muted)',
          backgroundColor: dragOver
            ? 'rgba(255,255,255,0.08)'
            : isSelected
              ? 'rgba(255,255,255,0.06)'
              : undefined,
        }}
      >
        {entry.isDirectory ? (
          expanded ? (
            <CaretDown size={10} weight="bold" className="shrink-0" style={{ color: 'var(--cristal-text-muted)' }} />
          ) : (
            <CaretRight size={10} weight="bold" className="shrink-0" style={{ color: 'var(--cristal-text-muted)' }} />
          )
        ) : (
          <span style={{ width: 10, flexShrink: 0 }} />
        )}

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

      {expanded &&
        children?.map((child) => (
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
            renamingPath={renamingPath}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
            onContextMenu={onContextMenu}
            onDrop={onDrop}
            selectedPath={selectedPath}
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
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

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

  /** Refrescar un directorio (raíz o sub) y actualizar cache. */
  const refreshDir = useCallback(
    async (dirPath: string) => {
      try {
        const result = await window.cristalAPI.readDirectory(dirPath)
        if (dirPath === state.rootPath) {
          setEntries(result)
        } else {
          setChildrenCache((prev) => new Map(prev).set(dirPath, result))
        }
      } catch {
        /* ignore */
      }
    },
    [state.rootPath],
  )

  // Refrescar explorador ante cambios externos del filesystem
  useEffect(() => {
    if (!state.rootPath) return
    const unsub = window.cristalAPI.onFsWatchEvent((event) => {
      if (event.eventType === 'rename') {
        // Estructura cambió (archivo/carpeta creado, eliminado o renombrado)
        if (event.parentDir === state.rootPath) {
          loadRoot()
        } else {
          refreshDir(event.parentDir)
        }
      }
    })
    return unsub
  }, [state.rootPath, loadRoot, refreshDir])

  const handleToggle = useCallback(
    async (path: string, shouldExpand: boolean) => {
      if (shouldExpand) {
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
    },
    [childrenCache],
  )

  const handleFileClick = useCallback(
    (filePath: string) => {
      setSelectedPath(filePath)
      requestOpenFile(filePath)
    },
    [requestOpenFile],
  )

  /* ── Toolbar actions ── */

  const handleNewFile = useCallback(() => {
    if (!state.rootPath) return
    setCreatingIn({ parentPath: state.rootPath, type: 'file' })
    setRootCollapsed(false)
  }, [state.rootPath])

  const handleNewFolder = useCallback(() => {
    if (!state.rootPath) return
    setCreatingIn({ parentPath: state.rootPath, type: 'folder' })
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

  const handleCreationDone = useCallback(
    async () => {
      const p = creatingIn?.parentPath
      setCreatingIn(null)
      if (p) await refreshDir(p)
    },
    [creatingIn, refreshDir],
  )

  const toggleRootCollapsed = useCallback(() => {
    setRootCollapsed((prev) => !prev)
  }, [])

  /* ── Context menu ── */

  /* ── Context menu (nativo vía Electron Menu.popup) ── */

  const handleContextMenu = useCallback(
    async (e: React.MouseEvent, entry: DirEntry) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedPath(entry.path)

      // Construir items serializables para el menú nativo
      const items: { id: string; label: string; accelerator?: string; separator?: boolean }[] = []

      if (!entry.isDirectory) {
        items.push({ id: 'open', label: 'Abrir' })
        items.push({ id: 'sep-1', label: '', separator: true })
      }

      if (entry.isDirectory) {
        items.push({ id: 'new-file', label: 'Nuevo archivo' })
        items.push({ id: 'new-folder', label: 'Nueva carpeta' })
        items.push({ id: 'sep-2', label: '', separator: true })
      }

      items.push({ id: 'rename', label: 'Renombrar', accelerator: 'F2' })
      items.push({ id: 'copy-path', label: 'Copiar ruta', accelerator: 'Shift+Alt+C' })
      items.push({ id: 'sep-3', label: '', separator: true })
      items.push({ id: 'reveal', label: 'Revelar en el Explorador' })
      items.push({ id: 'sep-4', label: '', separator: true })
      items.push({ id: 'delete', label: 'Eliminar', accelerator: 'Delete' })

      const actionId = await window.cristalAPI.showContextMenu(items)
      if (!actionId) return

      switch (actionId) {
        case 'open':
          requestOpenFile(entry.path)
          break
        case 'new-file':
          await handleToggle(entry.path, true)
          setCreatingIn({ parentPath: entry.path, type: 'file' })
          break
        case 'new-folder':
          await handleToggle(entry.path, true)
          setCreatingIn({ parentPath: entry.path, type: 'folder' })
          break
        case 'rename':
          setRenamingPath(entry.path)
          break
        case 'copy-path':
          window.cristalAPI.copyPath(entry.path)
          break
        case 'reveal':
          window.cristalAPI.revealInExplorer(entry.path)
          break
        case 'delete':
          try {
            await window.cristalAPI.deletePath(entry.path)
            await refreshDir(parentDir(entry.path))
          } catch {
            /* ignore */
          }
          break
      }
    },
    [requestOpenFile, handleToggle, refreshDir],
  )

  /* ── Rename ── */

  const handleRenameConfirm = useCallback(
    async (oldPath: string, newName: string) => {
      setRenamingPath(null)
      try {
        await window.cristalAPI.renamePath(oldPath, newName)
        await refreshDir(parentDir(oldPath))
      } catch {
        /* ignore */
      }
    },
    [refreshDir],
  )

  const handleRenameCancel = useCallback(() => setRenamingPath(null), [])

  /* ── Drag & Drop (move) ── */

  const handleDrop = useCallback(
    async (sourcePath: string, destDir: string) => {
      // Evitar mover a sí mismo o su padre actual
      if (parentDir(sourcePath) === destDir) return
      try {
        await window.cristalAPI.movePath(sourcePath, destDir)
        // Refrescar carpetas afectadas
        await refreshDir(parentDir(sourcePath))
        await refreshDir(destDir)
      } catch {
        /* ignore */
      }
    },
    [refreshDir],
  )

  /* ── Drop on root area (tree blank space) ── */

  const handleRootDragOver = (e: React.DragEvent) => {
    if (!state.rootPath) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!state.rootPath) return
    const sourcePath = e.dataTransfer.getData(DRAG_MIME)
    if (sourcePath) {
      handleDrop(sourcePath, state.rootPath)
    }
  }

  /* ── Root context menu ── */

  const handleRootContext = useCallback(
    (e: React.MouseEvent) => {
      if (!state.rootPath) return
      e.preventDefault()
      handleContextMenu(e, { name: state.rootName, path: state.rootPath, isDirectory: true })
    },
    [state.rootPath, state.rootName, handleContextMenu],
  )

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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <Folder size={32} weight="light" style={{ color: 'var(--cristal-text-faint)' }} />
          <span className="text-[11px]" style={{ color: 'var(--cristal-text-faint)' }}>
            Abrí una carpeta para explorar archivos
          </span>
          <button
            onClick={() => window.cristalAPI.openFolderDialog()}
            className="w-full max-w-[180px] rounded-[3px] py-[4px] text-[11px] transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'rgba(0, 229, 255, 0.12)',
              color: 'var(--cristal-accent)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
            }}
          >
            Abrir Carpeta
          </button>
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

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/header:opacity-100">
              <ToolbarButton icon={FilePlus} title="Nuevo archivo" onClick={handleNewFile} />
              <ToolbarButton icon={FolderPlus} title="Nueva carpeta" onClick={handleNewFolder} />
              <ToolbarButton icon={ArrowClockwise} title="Refrescar explorador" onClick={handleRefresh} />
              <ToolbarButton icon={ArrowsInSimple} title="Colapsar carpetas" onClick={handleCollapseAll} />
            </div>
          </div>

          {/* Árbol de archivos real */}
          {!rootCollapsed && (
            <div
              className="flex-1 overflow-y-auto py-1"
              onContextMenu={handleRootContext}
              onDragOver={handleRootDragOver}
              onDrop={handleRootDrop}
            >
              {/* Inline creation at root level */}
              {creatingIn?.parentPath === state.rootPath && (
                <div style={{ paddingLeft: '12px' }}>
                  <InlineInput
                    type={creatingIn.type}
                    onConfirm={async (name) => {
                      const newPath = childPath(state.rootPath!, name)
                      try {
                        if (creatingIn.type === 'folder') {
                          await window.cristalAPI.createDirectory(newPath)
                        } else {
                          await window.cristalAPI.createFile(newPath)
                        }
                      } catch {
                        /* ignore */
                      }
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
                  renamingPath={renamingPath}
                  onRenameConfirm={handleRenameConfirm}
                  onRenameCancel={handleRenameCancel}
                  onContextMenu={handleContextMenu}
                  onDrop={handleDrop}
                  selectedPath={selectedPath}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}
