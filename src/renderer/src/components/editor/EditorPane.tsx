import { X, FileTs } from '@phosphor-icons/react'
import CodeEditor from './CodeEditor'

interface EditorPaneProps {
  fileName: string
  language: string
  content: string
  onContentChange: (value: string) => void
  onClose: () => void
}

/**
 * Panel principal del editor — pestaña superior + buffer Monaco.
 * Componente modular que encapsula la lógica de una pestaña individual
 * y delega el renderizado del texto a CodeEditor.
 */
export default function EditorPane({
  fileName,
  language,
  content,
  onContentChange,
  onClose,
}: EditorPaneProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Barra de pestaña */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3"
        style={{
          height: 36,
          backgroundColor: 'var(--cristal-bg-sidebar)',
          borderColor: 'var(--cristal-border)',
        }}
      >
        <FileTs
          size={16}
          weight="regular"
          style={{ color: 'var(--cristal-accent)', flexShrink: 0 }}
        />
        <span
          className="truncate text-xs font-medium"
          style={{ color: 'var(--cristal-text-normal)' }}
        >
          {fileName}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex items-center justify-center rounded"
          style={{
            width: 20,
            height: 20,
            color: 'var(--cristal-text-muted)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--cristal-bg-hover)'
            e.currentTarget.style.color = 'var(--cristal-text-normal)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--cristal-text-muted)'
          }}
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Buffer del editor — Monaco ocupa todo el espacio restante */}
      <div className="relative min-h-0 flex-1">
        <CodeEditor
          language={language}
          content={content}
          onContentChange={onContentChange}
        />
      </div>
    </div>
  )
}
