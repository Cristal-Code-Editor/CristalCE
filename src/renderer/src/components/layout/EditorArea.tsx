/**
 * Área central del editor donde vivirá Monaco Editor.
 * Por ahora muestra un placeholder con el fondo oscuro principal.
 * Se reemplazará con la integración de Monaco en etapas posteriores.
 */
export default function EditorArea() {
  return (
    <div
      className="flex h-full flex-1 items-center justify-center"
      style={{ backgroundColor: 'var(--cristal-bg-primary)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="text-lg font-light tracking-wide"
          style={{ color: 'var(--cristal-text-inactive)' }}
        >
          CristalCE
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--cristal-text-inactive)' }}
        >
          Selecciona un archivo para comenzar
        </span>
      </div>
    </div>
  )
}
