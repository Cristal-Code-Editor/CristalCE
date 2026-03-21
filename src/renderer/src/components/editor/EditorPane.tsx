import { useRef, useState, useEffect, useCallback, useMemo, type MouseEvent } from 'react'
import { X, Circle, FileTs, FileJs, FileCss, FileHtml, FileText, FileCode, DiamondsFour } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import CodeEditor from './CodeEditor'
import EditorToolbar from './EditorToolbar'
import CodePromptModal from './CodePromptModal'
import OutputPanel, { type OutputLine } from './OutputPanel'

/** Lenguajes que se pueden ejecutar */
const RUNNABLE = new Set(['javascript', 'typescript'])

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
  onLanguageChange: (id: string, language: string) => void
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
  description,
  onSelect,
  onClose,
}: {
  tab: TabData
  isActive: boolean
  isModified: boolean
  description?: string
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
        className="flex select-none items-baseline gap-1.5 truncate text-xs"
        style={{ maxWidth: description ? 220 : 140 }}
      >
        <span className="truncate" style={{ color: isActive ? '#fff' : '#969696' }}>
          {tab.fileName}
        </span>
        {description && (
          <span className="truncate text-[10px]" style={{ color: '#5a5a5e' }}>
            {description}
          </span>
        )}
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex min-w-[22px] items-center justify-center rounded-[4px] border px-[6px] py-[1px] text-[11px] font-medium"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.10)',
        color: 'var(--cristal-text-muted)',
      }}
    >
      {children}
    </kbd>
  )
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-[13px]" style={{ color: 'var(--cristal-text-muted)' }}>
        {label}
      </span>
      <span className="flex items-center gap-[3px]">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-[3px]">
            {i > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--cristal-text-faint)' }}>
                +
              </span>
            )}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </span>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center select-none"
      style={{ backgroundColor: '#1e1e1e' }}
    >
      <DiamondsFour size={72} weight="duotone" style={{ color: '#333', marginBottom: 32 }} />

      <div className="flex flex-col gap-[10px]">
        <ShortcutRow label="Nuevo archivo" keys={['Ctrl', 'N']} />
        <ShortcutRow label="Abrir archivo" keys={['Ctrl', 'O']} />
        <ShortcutRow label="Abrir carpeta" keys={['Ctrl', 'Shift', 'O']} />
      </div>
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
  onLanguageChange,
}: EditorPaneProps) {
  const tabBarRef = useRef<HTMLDivElement>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Estado del modal de generación
  const [showPromptModal, setShowPromptModal] = useState(false)

  // Estado de ejecución de código
  const [outputLines, setOutputLines] = useState<OutputLine[]>([])
  const [showOutput, setShowOutput] = useState(false)
  const [running, setRunning] = useState(false)

  // Referencia para insertar código generado en la posición del cursor
  const insertCodeRef = useRef<((code: string) => void) | null>(null)

  // Listeners IPC de ejecución de código
  useEffect(() => {
    const unsub1 = window.cristalAPI.onCodeStdout((data) => {
      setOutputLines((prev) => [...prev, { type: 'stdout', text: data }])
    })
    const unsub2 = window.cristalAPI.onCodeStderr((data) => {
      setOutputLines((prev) => [...prev, { type: 'stderr', text: data }])
    })
    const unsub3 = window.cristalAPI.onCodeExit((exitCode) => {
      setOutputLines((prev) => [...prev, { type: 'info', text: `\nProceso finalizó con código ${exitCode}\n` }])
      setRunning(false)
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  const handleRun = useCallback(() => {
    if (!activeTab) return
    setOutputLines([])
    setShowOutput(true)
    setRunning(true)
    window.cristalAPI.runCode(activeTab.content, activeTab.language)
  }, [activeTab])

  const handleStop = useCallback(() => {
    window.cristalAPI.stopCode()
  }, [])

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

  // Desambiguar pestañas con el mismo fileName mostrando la carpeta padre
  const tabDescriptions = useMemo(() => {
    const map = new Map<string, string>()
    const byName = new Map<string, TabData[]>()
    for (const tab of tabs) {
      const list = byName.get(tab.fileName) ?? []
      list.push(tab)
      byName.set(tab.fileName, list)
    }
    for (const [, group] of byName) {
      if (group.length < 2) continue
      for (const tab of group) {
        if (!tab.filePath) continue
        const parts = tab.filePath.split(/[/\\]/)
        // Tomar la carpeta padre inmediata
        const parent = parts.length >= 2 ? parts[parts.length - 2] : ''
        if (parent) map.set(tab.id, parent)
      }
    }
    return map
  }, [tabs])

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
            description={tabDescriptions.get(tab.id)}
            onSelect={() => onTabSelect(tab.id)}
            onClose={() => onTabClose(tab.id)}
          />
        ))}
      </div>

      {/* Barra de herramientas del editor */}
      {activeTab && (
        <EditorToolbar
          language={activeTab.language}
          runnable={RUNNABLE.has(activeTab.language)}
          running={running}
          onLanguageChange={(lang) => onLanguageChange(activeTab.id, lang)}
          onRequestCode={() => setShowPromptModal(true)}
          onRun={handleRun}
          onStop={handleStop}
        />
      )}

      {/* Editor + Output split */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Editor area */}
        <div className="relative min-h-0 flex-1">
          {activeTab && (
            <CodeEditor
              key={activeTab.id}
              language={activeTab.language}
              defaultValue={activeTab.content}
              onChange={(v) => onContentChange(activeTab.id, v)}
              onSave={() => onSave(activeTab.id)}
              onInsertCodeRef={insertCodeRef}
            />
          )}

          {/* Modal de generación de código */}
          {showPromptModal && activeTab && (
            <CodePromptModal
              language={activeTab.language}
              onClose={() => setShowPromptModal(false)}
              onCodeGenerated={(code) => insertCodeRef.current?.(code)}
            />
          )}
        </div>

        {/* Panel de output */}
        {showOutput && (
          <OutputPanel
            lines={outputLines}
            running={running}
            onClear={() => setOutputLines([])}
            onClose={() => setShowOutput(false)}
            onStop={handleStop}
          />
        )}
      </div>
    </div>
  )
}
