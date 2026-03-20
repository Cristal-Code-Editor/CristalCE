import { FolderOpen, Folder, FileTs, FileCss, FileHtml, CaretRight } from '@phosphor-icons/react'

/**
 * Panel lateral del explorador de archivos.
 * Identidad visual CristalCE: tipografía JetBrains Mono, iconos Phosphor light.
 * Será reemplazado por un árbol virtualizado cuando se implemente el sistema de archivos.
 */
export default function Sidebar() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden select-none"
      style={{ backgroundColor: 'var(--cristal-bg-sidebar)' }}
    >
      {/* Título de sección con icono de carpeta Phosphor */}
      <div className="flex h-9 shrink-0 items-center gap-2 px-4">
        <FolderOpen size={15} weight="light" className="text-[var(--cristal-accent)]" />
        <span
          className="text-[11px] font-medium tracking-wide"
          style={{ color: 'var(--cristal-text-muted)' }}
        >
          Explorador de Archivos
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
      className="flex h-[22px] cursor-pointer items-center gap-1.5 pr-2 text-[12px] hover:bg-[var(--cristal-bg-hover)]"
      style={{
        paddingLeft: `${12 + depth * 12}px`,
        color: isFolder ? 'var(--cristal-text-normal)' : 'var(--cristal-text-muted)',
      }}
    >
      <Icon size={14} weight="light" className={isFolder ? 'text-[var(--cristal-accent)]' : ''} />
      <span>{label}</span>
    </div>
  )
}
