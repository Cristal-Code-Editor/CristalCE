import { useState, useEffect, useCallback } from 'react'
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

/* ── Tree Node ─────────────────────────────────────────── */

function TreeNode({
  entry,
  depth,
  onFileClick,
}: {
  entry: DirEntry
  depth: number
  onFileClick: (filePath: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = useCallback(async () => {
    if (!entry.isDirectory) {
      onFileClick(entry.path)
      return
    }

    if (expanded) {
      setExpanded(false)
      return
    }

    if (children === null) {
      setLoading(true)
      try {
        const entries = await window.cristalAPI.readDirectory(entry.path)
        setChildren(entries)
      } catch {
        setChildren([])
      } finally {
        setLoading(false)
      }
    }
    setExpanded(true)
  }, [entry, expanded, children, onFileClick])

  const FolderIcon = expanded ? FolderOpen : FolderSimple
  const { Icon: FileIcon, color } = entry.isDirectory
    ? { Icon: FolderIcon, color: 'var(--cristal-accent)' }
    : getFileIcon(entry.name)

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

      {expanded && children?.map((child) => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} onFileClick={onFileClick} />
      ))}
    </>
  )
}

/* ── Sidebar ───────────────────────────────────────────── */

export default function Sidebar() {
  const { state, requestOpenFile } = useWorkspace()
  const [entries, setEntries] = useState<DirEntry[]>([])

  // Cargar directorio raíz cuando cambia rootPath
  useEffect(() => {
    if (!state.rootPath) {
      setEntries([])
      return
    }

    window.cristalAPI
      .readDirectory(state.rootPath)
      .then(setEntries)
      .catch(() => setEntries([])
    )
  }, [state.rootPath])

  const handleFileClick = useCallback(
    (filePath: string) => {
      requestOpenFile(filePath)
    },
    [requestOpenFile],
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
        /* Sin carpeta abierta */
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <Folder size={32} weight="light" style={{ color: 'var(--cristal-text-faint)', marginBottom: 8 }} />
          <span className="text-[11px]" style={{ color: 'var(--cristal-text-faint)' }}>
            Abrí una carpeta para explorar archivos
          </span>
        </div>
      ) : (
        <>
          {/* Nombre de la carpeta workspace */}
          <div
            className="flex h-7 shrink-0 items-center gap-1 px-3 text-[11px] font-bold"
            style={{ backgroundColor: 'var(--cristal-bg-activitybar)', color: 'var(--cristal-text-normal)' }}
          >
            <CaretDown size={12} weight="bold" />
            <span className="truncate">{state.rootName.toUpperCase()}</span>
          </div>

          {/* Árbol de archivos real */}
          <div className="flex-1 overflow-y-auto py-1">
            {entries.map((entry) => (
              <TreeNode key={entry.path} entry={entry} depth={0} onFileClick={handleFileClick} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
