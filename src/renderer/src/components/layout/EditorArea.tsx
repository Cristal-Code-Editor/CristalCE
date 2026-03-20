import CodeEditor from '../editor/CodeEditor'

/**
 * Área central del editor — renderiza Monaco Editor.
 */
export default function EditorArea() {
  return (
    <div
      className="flex h-full w-full flex-1"
      style={{ backgroundColor: 'var(--cristal-bg-editor)' }}
    >
      <CodeEditor />
    </div>
  )
}
