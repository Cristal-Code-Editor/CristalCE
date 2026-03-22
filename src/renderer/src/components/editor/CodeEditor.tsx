import * as monaco from 'monaco-editor'
import { useRef, useEffect, type MutableRefObject } from 'react'

/* ── Props ─────────────────────────────────────────────── */

interface CodeEditorProps {
  language: string
  defaultValue: string
  onChange: (value: string) => void
  onSave?: () => void
  /** Ruta del archivo en disco — permite a Monaco mapear el modelo a una URI file:/// real. */
  filePath?: string | null
  /** Ref inyectada por el padre para insertar código generado en la posición del cursor. */
  onInsertCodeRef?: MutableRefObject<((code: string) => void) | null>
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
      // ── Comments ────────────────────────────────────────
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '6a9955', fontStyle: 'italic' },

      // ── Keywords & Control Flow ─────────────────────────
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'keyword.control', foreground: 'c586c0' },
      { token: 'keyword.operator', foreground: 'd4d4d4' },
      { token: 'keyword.other', foreground: '569cd6' },

      // ── Storage / Modifiers ─────────────────────────────
      { token: 'storage', foreground: '569cd6' },
      { token: 'storage.type', foreground: '569cd6' },
      { token: 'storage.modifier', foreground: '569cd6' },

      // ── Strings ─────────────────────────────────────────
      { token: 'string', foreground: 'ce9178' },
      { token: 'string.escape', foreground: 'd7ba7d' },
      { token: 'string.regex', foreground: 'd16969' },

      // ── Numbers / Constants ─────────────────────────────
      { token: 'number', foreground: 'b5cea8' },
      { token: 'number.hex', foreground: 'b5cea8' },
      { token: 'constant', foreground: '569cd6' },
      { token: 'constant.language', foreground: '569cd6' },

      // ── Types & Interfaces ──────────────────────────────
      { token: 'type', foreground: '4ec9b0' },
      { token: 'type.identifier', foreground: '4ec9b0' },
      { token: 'support.type', foreground: '4ec9b0' },

      // ── Functions ───────────────────────────────────────
      { token: 'entity.name.function', foreground: 'dcdcaa' },
      { token: 'support.function', foreground: 'dcdcaa' },
      { token: 'meta.function-call', foreground: 'dcdcaa' },

      // ── Variables / Parameters ──────────────────────────
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'variable.parameter', foreground: '9cdcfe' },
      { token: 'variable.other', foreground: '9cdcfe' },
      { token: 'identifier', foreground: '9cdcfe' },

      // ── Operators / Punctuation ─────────────────────────
      { token: 'operator', foreground: 'd4d4d4' },
      { token: 'delimiter', foreground: 'd4d4d4' },
      { token: 'delimiter.bracket', foreground: 'ffd700' },
      { token: 'delimiter.parenthesis', foreground: 'da70d6' },
      { token: 'delimiter.square', foreground: '179fff' },

      // ── Tags (HTML/JSX/TSX) ──────────────────────────────
      { token: 'tag', foreground: '569cd6' },
      { token: 'tag.html', foreground: '569cd6' },
      { token: 'tag.id.pug', foreground: '4ec9b0' },
      { token: 'metatag', foreground: '569cd6' },
      { token: 'metatag.html', foreground: '569cd6' },
      { token: 'metatag.content.html', foreground: 'ce9178' },
      // JSX/TSX delimitadores: <, >, />
      { token: 'delimiter.html', foreground: '808080' },
      // Componente JSX/TSX en mayúscula (Monaco los tokeniza con sufijo .ts/.js)
      { token: 'type.identifier.ts', foreground: '4ec9b0' },
      { token: 'type.identifier.js', foreground: '4ec9b0' },

      // ── Attributes (HTML/JSX) ───────────────────────────
      { token: 'attribute.name', foreground: '9cdcfe' },
      { token: 'attribute.name.html', foreground: '9cdcfe' },
      { token: 'attribute.value', foreground: 'ce9178' },
      { token: 'attribute.value.html', foreground: 'ce9178' },

      // ── CSS Specific ────────────────────────────────────
      { token: 'attribute.name.css', foreground: '9cdcfe' },
      { token: 'attribute.value.css', foreground: 'ce9178' },
      { token: 'attribute.value.number.css', foreground: 'b5cea8' },
      { token: 'attribute.value.unit.css', foreground: 'b5cea8' },
      { token: 'tag.css', foreground: 'd7ba7d' },
      { token: 'tag.id.css', foreground: '4ec9b0' },
      { token: 'tag.class.css', foreground: 'd7ba7d' },

      // ── JSON Specific ───────────────────────────────────
      { token: 'string.key.json', foreground: '9cdcfe' },
      { token: 'string.value.json', foreground: 'ce9178' },
      { token: 'number.json', foreground: 'b5cea8' },
      { token: 'keyword.json', foreground: '569cd6' },

      // ── Markdown ────────────────────────────────────────
      { token: 'markup.heading', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'markup.bold', fontStyle: 'bold' },
      { token: 'markup.italic', fontStyle: 'italic' },
      { token: 'markup.inline', foreground: 'ce9178' },
      { token: 'markup.underline.link', foreground: '4ec9b0' },

      // ── Python Specific ─────────────────────────────────
      { token: 'keyword.python', foreground: 'c586c0' },
      { token: 'identifier.python', foreground: '9cdcfe' },
      { token: 'type.identifier.python', foreground: '4ec9b0' },
      { token: 'decorator.python', foreground: 'dcdcaa' },
      { token: 'number.python', foreground: 'b5cea8' },
      { token: 'string.python', foreground: 'ce9178' },

      // ── TypeScript / JavaScript con sufijo ──────────────
      { token: 'keyword.ts', foreground: '569cd6' },
      { token: 'keyword.js', foreground: '569cd6' },
      { token: 'identifier.ts', foreground: '9cdcfe' },
      { token: 'identifier.js', foreground: '9cdcfe' },
      { token: 'string.ts', foreground: 'ce9178' },
      { token: 'string.js', foreground: 'ce9178' },
      { token: 'number.ts', foreground: 'b5cea8' },
      { token: 'number.js', foreground: 'b5cea8' },
      { token: 'regexp.ts', foreground: 'd16969' },
      { token: 'regexp.js', foreground: 'd16969' },
      { token: 'delimiter.ts', foreground: 'd4d4d4' },
      { token: 'delimiter.js', foreground: 'd4d4d4' },
      { token: 'comment.ts', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'comment.js', foreground: '6a9955', fontStyle: 'italic' },

      // ── SCSS / Less ─────────────────────────────────────
      { token: 'tag.scss', foreground: 'd7ba7d' },
      { token: 'attribute.name.scss', foreground: '9cdcfe' },
      { token: 'attribute.value.scss', foreground: 'ce9178' },
      { token: 'attribute.value.number.scss', foreground: 'b5cea8' },
      { token: 'attribute.value.unit.scss', foreground: 'b5cea8' },
      { token: 'variable.scss', foreground: '9cdcfe' },
      { token: 'keyword.scss', foreground: 'c586c0' },
      { token: 'operator.scss', foreground: 'd4d4d4' },
      { token: 'tag.less', foreground: 'd7ba7d' },
      { token: 'attribute.name.less', foreground: '9cdcfe' },
      { token: 'variable.less', foreground: '9cdcfe' },

      // ── YAML ────────────────────────────────────────────
      { token: 'string.yaml', foreground: 'ce9178' },
      { token: 'number.yaml', foreground: 'b5cea8' },
      { token: 'keyword.yaml', foreground: '569cd6' },
      { token: 'type.yaml', foreground: '4ec9b0' },

      // ── Shell / Bash ────────────────────────────────────
      { token: 'keyword.shell', foreground: 'c586c0' },
      { token: 'variable.shell', foreground: '9cdcfe' },
      { token: 'string.shell', foreground: 'ce9178' },
      { token: 'comment.shell', foreground: '6a9955', fontStyle: 'italic' },

      // ── SQL ─────────────────────────────────────────────
      { token: 'keyword.sql', foreground: '569cd6' },
      { token: 'operator.sql', foreground: 'd4d4d4' },
      { token: 'string.sql', foreground: 'ce9178' },
      { token: 'number.sql', foreground: 'b5cea8' },
      { token: 'predefined.sql', foreground: 'dcdcaa' },

      // ── Rust ────────────────────────────────────────────
      { token: 'keyword.rust', foreground: 'c586c0' },
      { token: 'keyword.type.rust', foreground: '569cd6' },
      { token: 'type.identifier.rust', foreground: '4ec9b0' },
      { token: 'string.rust', foreground: 'ce9178' },
      { token: 'number.rust', foreground: 'b5cea8' },
      { token: 'attribute.rust', foreground: 'dcdcaa' },

      // ── Go ──────────────────────────────────────────────
      { token: 'keyword.go', foreground: '569cd6' },
      { token: 'type.identifier.go', foreground: '4ec9b0' },
      { token: 'string.go', foreground: 'ce9178' },
      { token: 'number.go', foreground: 'b5cea8' },
      { token: 'comment.go', foreground: '6a9955', fontStyle: 'italic' },

      // ── C / C++ ─────────────────────────────────────────
      { token: 'keyword.cpp', foreground: '569cd6' },
      { token: 'keyword.c', foreground: '569cd6' },
      { token: 'identifier.cpp', foreground: '9cdcfe' },
      { token: 'type.identifier.cpp', foreground: '4ec9b0' },
      { token: 'string.cpp', foreground: 'ce9178' },
      { token: 'number.cpp', foreground: 'b5cea8' },
      { token: 'directive.cpp', foreground: 'c586c0' },

      // ── Java ────────────────────────────────────────────
      { token: 'keyword.java', foreground: '569cd6' },
      { token: 'keyword.control.java', foreground: 'c586c0' },
      { token: 'type.identifier.java', foreground: '4ec9b0' },
      { token: 'identifier.java', foreground: '9cdcfe' },
      { token: 'annotation.java', foreground: 'dcdcaa' },
      { token: 'string.java', foreground: 'ce9178' },
      { token: 'number.java', foreground: 'b5cea8' },
      { token: 'number.hex.java', foreground: 'b5cea8' },
      { token: 'comment.java', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.java', foreground: 'd4d4d4' },
      { token: 'operator.java', foreground: 'd4d4d4' },

      // ── C# ──────────────────────────────────────────────
      { token: 'keyword.cs', foreground: '569cd6' },
      { token: 'keyword.control.cs', foreground: 'c586c0' },
      { token: 'type.identifier.cs', foreground: '4ec9b0' },
      { token: 'identifier.cs', foreground: '9cdcfe' },
      { token: 'annotation.cs', foreground: 'dcdcaa' },
      { token: 'string.cs', foreground: 'ce9178' },
      { token: 'string.escape.cs', foreground: 'd7ba7d' },
      { token: 'number.cs', foreground: 'b5cea8' },
      { token: 'number.hex.cs', foreground: 'b5cea8' },
      { token: 'comment.cs', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.cs', foreground: 'd4d4d4' },
      { token: 'operator.cs', foreground: 'd4d4d4' },

      // ── Kotlin ──────────────────────────────────────────
      { token: 'keyword.kotlin', foreground: '569cd6' },
      { token: 'keyword.control.kotlin', foreground: 'c586c0' },
      { token: 'type.identifier.kotlin', foreground: '4ec9b0' },
      { token: 'identifier.kotlin', foreground: '9cdcfe' },
      { token: 'annotation.kotlin', foreground: 'dcdcaa' },
      { token: 'string.kotlin', foreground: 'ce9178' },
      { token: 'number.kotlin', foreground: 'b5cea8' },
      { token: 'comment.kotlin', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.kotlin', foreground: 'd4d4d4' },

      // ── Swift ────────────────────────────────────────────
      { token: 'keyword.swift', foreground: 'c586c0' },
      { token: 'type.identifier.swift', foreground: '4ec9b0' },
      { token: 'identifier.swift', foreground: '9cdcfe' },
      { token: 'string.swift', foreground: 'ce9178' },
      { token: 'number.swift', foreground: 'b5cea8' },
      { token: 'comment.swift', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'attribute.swift', foreground: 'dcdcaa' },
      { token: 'operator.swift', foreground: 'd4d4d4' },
      { token: 'delimiter.swift', foreground: 'd4d4d4' },

      // ── Dart ─────────────────────────────────────────────
      { token: 'keyword.dart', foreground: '569cd6' },
      { token: 'keyword.control.dart', foreground: 'c586c0' },
      { token: 'type.identifier.dart', foreground: '4ec9b0' },
      { token: 'identifier.dart', foreground: '9cdcfe' },
      { token: 'annotation.dart', foreground: 'dcdcaa' },
      { token: 'string.dart', foreground: 'ce9178' },
      { token: 'string.escape.dart', foreground: 'd7ba7d' },
      { token: 'number.dart', foreground: 'b5cea8' },
      { token: 'comment.dart', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.dart', foreground: 'd4d4d4' },

      // ── Lua ──────────────────────────────────────────────
      { token: 'keyword.lua', foreground: '569cd6' },
      { token: 'identifier.lua', foreground: '9cdcfe' },
      { token: 'string.lua', foreground: 'ce9178' },
      { token: 'number.lua', foreground: 'b5cea8' },
      { token: 'comment.lua', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.lua', foreground: 'd4d4d4' },
      { token: 'global.lua', foreground: 'dcdcaa' },

      // ── PowerShell ──────────────────────────────────────
      { token: 'keyword.powershell', foreground: '569cd6' },
      { token: 'variable.powershell', foreground: '9cdcfe' },
      { token: 'string.powershell', foreground: 'ce9178' },
      { token: 'number.powershell', foreground: 'b5cea8' },
      { token: 'comment.powershell', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.powershell', foreground: 'd4d4d4' },
      { token: 'type.powershell', foreground: '4ec9b0' },

      // ── Perl ─────────────────────────────────────────────
      { token: 'keyword.perl', foreground: 'c586c0' },
      { token: 'variable.perl', foreground: '9cdcfe' },
      { token: 'string.perl', foreground: 'ce9178' },
      { token: 'number.perl', foreground: 'b5cea8' },
      { token: 'comment.perl', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'regexp.perl', foreground: 'd16969' },
      { token: 'operator.perl', foreground: 'd4d4d4' },

      // ── Scala ────────────────────────────────────────────
      { token: 'keyword.scala', foreground: '569cd6' },
      { token: 'keyword.control.scala', foreground: 'c586c0' },
      { token: 'type.identifier.scala', foreground: '4ec9b0' },
      { token: 'identifier.scala', foreground: '9cdcfe' },
      { token: 'annotation.scala', foreground: 'dcdcaa' },
      { token: 'string.scala', foreground: 'ce9178' },
      { token: 'number.scala', foreground: 'b5cea8' },
      { token: 'comment.scala', foreground: '6a9955', fontStyle: 'italic' },

      // ── Visual Basic ────────────────────────────────────
      { token: 'keyword.vb', foreground: '569cd6' },
      { token: 'identifier.vb', foreground: '9cdcfe' },
      { token: 'string.vb', foreground: 'ce9178' },
      { token: 'number.vb', foreground: 'b5cea8' },
      { token: 'comment.vb', foreground: '6a9955', fontStyle: 'italic' },

      // ── PHP ─────────────────────────────────────────────
      { token: 'metatag.php', foreground: '569cd6' },
      { token: 'keyword.php', foreground: 'c586c0' },
      { token: 'variable.php', foreground: '9cdcfe' },
      { token: 'string.php', foreground: 'ce9178' },

      // ── Ruby ────────────────────────────────────────────
      { token: 'keyword.ruby', foreground: 'c586c0' },
      { token: 'string.ruby', foreground: 'ce9178' },
      { token: 'variable.ruby', foreground: '9cdcfe' },
      { token: 'regexp.ruby', foreground: 'd16969' },

      // ── Annotations / Decorators ────────────────────────
      { token: 'annotation', foreground: 'dcdcaa' },
      { token: 'meta.decorator', foreground: 'dcdcaa' },

      // ── Namespace / Module ──────────────────────────────
      { token: 'namespace', foreground: '4ec9b0' },
      { token: 'entity.name.class', foreground: '4ec9b0' },
      { token: 'entity.name.type', foreground: '4ec9b0' },

      // ── Invalid ─────────────────────────────────────────
      { token: 'invalid', foreground: 'f44747' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#ffffff0A',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editor.findMatchBackground': '#515c6a',
      'editor.findMatchHighlightBackground': '#ea5c0055',
      'editor.wordHighlightBackground': '#575757B8',
      'editor.wordHighlightStrongBackground': '#004972B8',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#888888',
      'editorBracketHighlight.foreground1': '#ffd700',
      'editorBracketHighlight.foreground2': '#da70d6',
      'editorBracketHighlight.foreground3': '#179fff',
      'editorBracketHighlight.foreground4': '#ffd700',
      'editorBracketHighlight.foreground5': '#da70d6',
      'editorBracketHighlight.foreground6': '#179fff',
      'editorWidget.background': '#252526',
      'editorWidget.border': '#454545',
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#454545',
      'editorSuggestWidget.selectedBackground': '#04395e',
      'editorSuggestWidget.highlightForeground': '#18a0fb',
      'editorHoverWidget.background': '#252526',
      'editorHoverWidget.border': '#454545',
      'peekView.border': '#007acc',
      'peekViewEditor.background': '#001f33',
      'peekViewResult.background': '#252526',
      'scrollbarSlider.background': '#79797933',
      'scrollbarSlider.hoverBackground': '#64646466',
      'scrollbarSlider.activeBackground': '#bfbfbf66',
    },
  })
}

/* ── Component ─────────────────────────────────────────── */

export default function CodeEditor({ language, defaultValue, onChange, onSave, filePath, onInsertCodeRef }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  // Sincronizar lenguaje al modelo Monaco cuando cambia el prop
  useEffect(() => {
    if (!editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return
    monaco.editor.setModelLanguage(model, language)
  }, [language])

  useEffect(() => {
    if (!containerRef.current) return

    ensureTheme()

    // Crear modelo con URI file:/// para que el TS worker reconozca .tsx/.jsx
    let model: monaco.editor.ITextModel | undefined
    if (filePath) {
      const uri = monaco.Uri.parse(`file:///${filePath.replace(/\\/g, '/')}`)
      model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(defaultValue, language, uri)
      model.setValue(defaultValue)
    }

    const editor = monaco.editor.create(containerRef.current, {
      model: model ?? undefined,
      value: model ? undefined : defaultValue,
      language: model ? undefined : language,
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

      // AI inline completions (ghost text)
      inlineSuggest: { enabled: true },
    })

    editorRef.current = editor

    // ── AI Inline Completion Provider ──────────────────────
    // Muestra sugerencias ghost-text del modelo Qwen vía proxy.
    // Se dispara tras 600ms de inactividad para no saturar el backend.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const inlineProvider = monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model, position, _ctx, cancelToken) => {
        // Texto hasta la posición del cursor (máx ~50 líneas de contexto)
        const textUntilPosition = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 50),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        })

        // No solicitar si la línea está vacía o muy corta
        if (textUntilPosition.trim().length < 5) return { items: [] }

        // Debounce: esperar 600ms de inactividad
        if (debounceTimer) clearTimeout(debounceTimer)

        const completion = await new Promise<string>((resolve) => {
          debounceTimer = setTimeout(async () => {
            if (cancelToken.isCancellationRequested) {
              resolve('')
              return
            }
            try {
              const result = await window.cristalAPI.requestCompletion(
                textUntilPosition,
                language,
              )
              resolve(result)
            } catch {
              resolve('')
            }
          }, 600)

          cancelToken.onCancellationRequested(() => {
            if (debounceTimer) clearTimeout(debounceTimer)
            resolve('')
          })
        })

        if (!completion) return { items: [] }

        return {
          items: [
            {
              insertText: completion,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              ),
            },
          ],
        }
      },
      freeInlineCompletions: () => {},
    })

    // Forzar recálculo de métricas de fuente para alinear cursor correctamente
    // Workaround: Monaco calcula métricas antes de que la fuente cargue completamente.
    document.fonts.ready.then(() => {
      monaco.editor.remeasureFonts()
    })

    // Ctrl+S / Cmd+S
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave)
    }

    // Exponer función para insertar código generado en la posición del cursor
    if (onInsertCodeRef) {
      onInsertCodeRef.current = (code: string) => {
        const position = editor.getPosition()
        if (!position) return
        editor.executeEdits('cristal-ai-generate', [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
            text: code,
          },
        ])
      }
    }

    // Propagate changes
    const disposable = editor.onDidChangeModelContent(() => {
      onChange(editor.getValue())
    })

    editor.focus()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (onInsertCodeRef) onInsertCodeRef.current = null
      inlineProvider.dispose()
      disposable.dispose()
      editor.dispose()
      if (model) model.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
