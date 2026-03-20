import { FolderOpen, Folder, FileTs, FileCss, FileHtml, CaretRight } from '@phosphor-icons/react'

/**
 * Panel lateral del explorador de archivos.
 * Identidad visual CristalCE: tipografía JetBrains Mono, iconos Phosphor light.
 * Será reemplazado por un árbol virtualizado cuando se implemente el sistema de archivos.
 */
export default function Sidebar() {
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

      {/* Sección colapsable del workspace */}
      <div
        className="flex h-7 shrink-0 cursor-pointer items-center gap-1 px-3 text-[11px] font-bold"
        style={{ backgroundColor: 'var(--cristal-bg-activitybar)', color: 'var(--cristal-text-normal)' }}
      >
        <CaretRight size={12} weight="bold" />
        <span>CristalCE</span>
      </div>

      {/* Árbol de archivos placeholder — jerarquía visual con iconos consistentes */}
      <div className="flex-1 overflow-y-auto py-1">
        <TreeItem icon={Folder} label="src" depth={0} isFolder />
        <TreeItem icon={Folder} label="main" depth={1} isFolder />
        <TreeItem icon={FileTs} label="index.ts" depth={2} />
        <TreeItem icon={FileTs} label="ipcChannels.ts" depth={2} />
        <TreeItem icon={Folder} label="renderer" depth={1} isFolder />
        <TreeItem icon={FileHtml} label="index.html" depth={2} />
        <TreeItem icon={FileTs} label="App.tsx" depth={2} />
        <TreeItem icon={FileCss} label="main.css" depth={2} />
      </div>
    </div>
  )
}

/**
 * Item del árbol de archivos placeholder.
 * Profundidad visual con padding-left incremental.
 */
function TreeItem({
  icon: Icon,
  label,
  depth,
  isFolder = false,
}: {
  icon: React.ElementType
  label: string
  depth: number
  isFolder?: boolean
}) {
  return (
    <div
      className="flex h-[22px] cursor-pointer items-center gap-1.5 px-2 pr-2 text-[12px] hover:bg-white/5"
      style={{
        paddingLeft: `${12 + depth * 12}px`,
        color: isFolder ? 'var(--cristal-text-normal)' : 'var(--cristal-text-muted)',
      }}
    >
      <Icon size={14} weight="light" className={`shrink-0 ${isFolder ? 'text-[var(--cristal-accent)]' : ''}`} />
      <span className="truncate whitespace-nowrap">{label}</span>
    </div>
  )
}
