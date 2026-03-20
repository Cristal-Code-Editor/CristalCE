import * as monaco from 'monaco-editor'
import { useRef, useEffect } from 'react'

/* ── Props ─────────────────────────────────────────────── */

interface CodeEditorProps {
  language: string
  defaultValue: string
  onChange: (value: string) => void
  onSave?: () => void
}

/* ── Theme (defined once globally) ─────────────────────── */

let themeRegistered = false

function ensureTheme() {
  if (themeRegistered) return
  themeRegistered = true

  monaco.editor.defineTheme('cristal-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'type.identifier', foreground: '4ec9b0' },
      { token: 'identifier', foreground: '9cdcfe' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#ffffff0A',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'editorWidget.background': '#252526',
      'editorWidget.border': '#454545',
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.selectedBackground': '#04395e',
      'editorSuggestWidget.highlightForeground': '#18a0fb',
      'scrollbarSlider.background': '#79797933',
      'scrollbarSlider.hoverBackground': '#64646466',
      'scrollbarSlider.activeBackground': '#bfbfbf66',
    },
  })
}

/* ── Component ─────────────────────────────────────────── */

export default function CodeEditor({ language, defaultValue, onChange, onSave }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    ensureTheme()

    const editor = monaco.editor.create(containerRef.current, {
      value: defaultValue,
      language,
      theme: 'cristal-dark',

      // Font — fontWeight explícito para métricas precisas del cursor
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      fontWeight: '400',
      lineHeight: 20,
      fontLigatures: false,

      // Cursor
      cursorBlinking: 'smooth',
      cursorStyle: 'line',
      cursorWidth: 2,

      // Layout
      padding: { top: 12 },
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      showFoldingControls: 'mouseover',
      smoothScrolling: true,
      scrollBeyondLastLine: true,
      automaticLayout: true,

      // Minimap
      minimap: { enabled: true, renderCharacters: false, showSlider: 'mouseover' },

      // Brackets
      bracketPairColorization: { enabled: true },
      guides: { indentation: true, bracketPairs: 'active' },
      matchBrackets: 'always',

      // Rendering
      renderLineHighlight: 'line',
      renderWhitespace: 'selection',
      roundedSelection: true,

      // Editing
      autoClosingBrackets: 'languageDefined',
      autoClosingQuotes: 'languageDefined',
      autoIndent: 'full',
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',

      // Suggestions
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      contextmenu: true,
    })

    editorRef.current = editor

    // Forzar recálculo de métricas de fuente para alinear cursor correctamente
    // Workaround: Monaco calcula métricas antes de que la fuente cargue completamente.
    document.fonts.ready.then(() => {
      monaco.editor.remeasureFonts()
    })

    // Ctrl+S / Cmd+S
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave)
    }

    // Propagate changes
    const disposable = editor.onDidChangeModelContent(() => {
      onChange(editor.getValue())
    })

    editor.focus()

    return () => {
      disposable.dispose()
      editor.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
