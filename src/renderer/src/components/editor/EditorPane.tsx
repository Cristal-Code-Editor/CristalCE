import { useRef, useEffect, useCallback, type MouseEvent } from 'react'
import { X, Circle, FileTs, FileJs, FileCss, FileHtml, FileText, FileCode, DiamondsFour } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import CodeEditor from './CodeEditor'

/* ── Types ─────────────────────────────────────────────── */

export interface TabData {
  id: string
  fileName: string
  language: string
  content: string
  savedContent: string
  /** Ruta absoluta del archivo en disco. null = archivo nuevo sin guardar. */
  filePath: string | null
}

interface EditorPaneProps {
  tabs: TabData[]
  activeTabId: string | null
  onTabSelect: (id: string) => void
  onTabClose: (id: string) => void
  onContentChange: (id: string, content: string) => void
  onSave: (id: string) => void
}

/* ── File icon lookup ──────────────────────────────────── */

const ICON_MAP: Record<string, { Icon: PhosphorIcon; color: string }> = {
  ts: { Icon: FileTs, color: '#3178c6' },
  tsx: { Icon: FileTs, color: '#3178c6' },
  js: { Icon: FileJs, color: '#f0db4f' },
  jsx: { Icon: FileJs, color: '#f0db4f' },
  mjs: { Icon: FileJs, color: '#f0db4f' },
  css: { Icon: FileCss, color: '#563d7c' },
  scss: { Icon: FileCss, color: '#cd6799' },
  html: { Icon: FileHtml, color: '#e44d26' },
  htm: { Icon: FileHtml, color: '#e44d26' },
  json: { Icon: FileCode, color: '#f0db4f' },
  md: { Icon: FileText, color: '#519aba' },
  txt: { Icon: FileText, color: '#858585' },
  py: { Icon: FileCode, color: '#3572a5' },
  rs: { Icon: FileCode, color: '#dea584' },
  go: { Icon: FileCode, color: '#00add8' },
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ICON_MAP[ext] ?? { Icon: FileCode, color: '#858585' }
}

/* ── Single Tab ────────────────────────────────────────── */

function Tab({
  tab,
  isActive,
  isModified,
  onSelect,
  onClose,
}: {
  tab: TabData
  isActive: boolean
  isModified: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const { Icon, color } = fileIcon(tab.fileName)

  const onMiddleClick = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        onClose()
      }
    },
    [onClose],
  )

  const onCloseClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={onSelect}
      onMouseDown={onMiddleClick}
      className="group flex h-full shrink-0 cursor-pointer items-center gap-1.5 px-3"
      style={{
        backgroundColor: isActive ? '#1e1e1e' : '#2d2d2d',
        borderRight: '1px solid #191919',
        borderTop: isActive ? '1px solid #007acc' : '1px solid transparent',
      }}
    >
      <Icon size={15} weight="duotone" style={{ color, flexShrink: 0 }} />

      <span
        className="select-none truncate text-xs"
        style={{
          color: isActive ? '#fff' : '#969696',
          maxWidth: 140,
        }}
      >
        {tab.fileName}
      </span>

      {/* Close / modified indicator */}
      <button
        type="button"
        onClick={onCloseClick}
        className={`ml-1 flex items-center justify-center rounded ${
          isModified || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          color: '#969696',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#424242')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {isModified ? <Circle size={9} weight="fill" /> : <X size={14} />}
      </button>
    </div>
  )
}

/* ── Welcome ───────────────────────────────────────────── */

function WelcomeScreen() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center select-none"
      style={{ backgroundColor: '#1e1e1e' }}
    >
      <DiamondsFour size={48} weight="duotone" style={{ color: '#555', marginBottom: 16 }} />
      <span className="text-sm" style={{ color: '#555' }}>
        Abrí un archivo para comenzar
      </span>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────── */

export default function EditorPane({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onContentChange,
  onSave,
}: EditorPaneProps) {
  const tabBarRef = useRef<HTMLDivElement>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Scroll active tab into view
  useEffect(() => {
    if (!tabBarRef.current || !activeTabId) return
    const el = tabBarRef.current.querySelector<HTMLElement>(`[aria-selected="true"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest' })
  }, [activeTabId])

  // Horizontal scroll with mouse wheel on tab bar
  useEffect(() => {
    const el = tabBarRef.current
    if (!el) return
    const handler = (e: WheelEvent): void => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  if (tabs.length === 0) return <WelcomeScreen />

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
      {/* Tab bar */}
      <div
        ref={tabBarRef}
        className="cristal-tabs flex shrink-0 items-stretch overflow-x-auto"
        style={{ height: 35, backgroundColor: '#252526' }}
        role="tablist"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            isModified={tab.content !== tab.savedContent}
            onSelect={() => onTabSelect(tab.id)}
            onClose={() => onTabClose(tab.id)}
          />
        ))}
      </div>

      {/* Editor area */}
      <div className="relative min-h-0 flex-1">
        {activeTab && (
          <CodeEditor
            key={activeTab.id}
            language={activeTab.language}
            defaultValue={activeTab.content}
            onChange={(v) => onContentChange(activeTab.id, v)}
            onSave={() => onSave(activeTab.id)}
          />
        )}
      </div>
    </div>
  )
}
