import { useState, useCallback } from 'react'
import { DiamondsFour } from '@phosphor-icons/react'
import EditorPane from '../editor/EditorPane'

const DEMO_CONTENT = `// Bienvenido a CristalCE
// Tu entorno de desarrollo premium.

function init() {
  console.log('CristalCE está vivo');
}`

/**
 * Área central del editor — alterna entre estado vacío y el panel de edición.
 * Cuando isFileOpen es false muestra el logotipo con invitación a abrir un archivo;
 * cuando es true, renderiza EditorPane con Monaco integrado.
 */
export default function EditorArea() {
  const [isFileOpen, setIsFileOpen] = useState(true)
  const [content, setContent] = useState(DEMO_CONTENT)

  const handleClose = useCallback(() => setIsFileOpen(false), [])
  const handleContentChange = useCallback((value: string) => setContent(value), [])

  if (!isFileOpen) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 select-none"
        style={{ backgroundColor: 'var(--cristal-bg-editor)' }}
      >
        <DiamondsFour
          size={64}
          weight="duotone"
          style={{ color: 'var(--cristal-text-faint)', opacity: 0.5 }}
        />
        <span
          className="text-sm"
          style={{ color: 'var(--cristal-text-faint)' }}
        >
          Selecciona un archivo para comenzar
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full flex-1"
      style={{ backgroundColor: 'var(--cristal-bg-editor)' }}
    >
      <EditorPane
        fileName="Editor.tsx"
        language="typescript"
        content={content}
        onContentChange={handleContentChange}
        onClose={handleClose}
      />
    </div>
  )
}
