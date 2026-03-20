import Editor, { type BeforeMount, type OnChange } from '@monaco-editor/react'
import { useCallback } from 'react'

interface CodeEditorProps {
  language: string
  content: string
  onContentChange: (value: string) => void
}

const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('cristal-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#28282a',
    },
  })
}

function EditorLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#28282a',
        color: '#5a5a5e',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
      }}
    >
      Cargando editor…
    </div>
  )
}

/**
 * Motor Monaco envuelto en React.
 * Recibe contenido y lenguaje por props — listo para integración con sistema de archivos.
 */
export default function CodeEditor({ language, content, onContentChange }: CodeEditorProps) {
  const handleChange: OnChange = useCallback(
    (value) => onContentChange(value ?? ''),
    [onContentChange],
  )

  return (
    <Editor
      width="100%"
      height="100%"
      language={language}
      value={content}
      theme="cristal-dark"
      beforeMount={handleBeforeMount}
      onChange={handleChange}
      loading={<EditorLoading />}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 16 },
      }}
    />
  )
}
