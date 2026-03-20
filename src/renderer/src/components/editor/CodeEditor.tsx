import Editor, { type BeforeMount } from '@monaco-editor/react'

const DEFAULT_CODE = `// Bienvenido a CristalCE
// Tu entorno de desarrollo premium.

function init() {
  console.log('CristalCE está vivo');
}`

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

export default function CodeEditor() {
  return (
    <Editor
      width="100%"
      height="100%"
      defaultLanguage="typescript"
      defaultValue={DEFAULT_CODE}
      theme="cristal-dark"
      beforeMount={handleBeforeMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        cursorBlinking: 'smooth',
        smoothScrolling: true,
      }}
    />
  )
}
