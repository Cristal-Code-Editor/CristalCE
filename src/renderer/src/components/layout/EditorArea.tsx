/**
 * Área central del editor donde vivirá Monaco Editor.
 * Muestra el logo cristalino geométrico abstracto de CristalCE como placeholder.
 * Se reemplazará con la integración de Monaco en etapas posteriores.
 */
export default function EditorArea() {
  return (
    <div
      className="flex h-full flex-1 items-center justify-center"
      style={{ backgroundColor: 'var(--cristal-bg-editor)' }}
    >
      <div className="flex flex-col items-center gap-5 opacity-30">
        {/* Logo geométrico cristalino abstracto — SVG inline para máximo rendimiento */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[var(--cristal-accent)]"
        >
          <path
            d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M32 4L32 60"
            stroke="currentColor"
            strokeWidth="0.75"
            opacity="0.5"
          />
          <path
            d="M8 18L56 46"
            stroke="currentColor"
            strokeWidth="0.75"
            opacity="0.5"
          />
          <path
            d="M56 18L8 46"
            stroke="currentColor"
            strokeWidth="0.75"
            opacity="0.5"
          />
          <circle cx="32" cy="32" r="3" fill="currentColor" opacity="0.6" />
        </svg>

        <div className="flex flex-col items-center gap-1.5">
          <span
            className="text-sm font-medium tracking-[0.2em]"
            style={{ color: 'var(--cristal-text-faint)' }}
          >
            CristalCE
          </span>
          <span
            className="text-[11px]"
            style={{ color: 'var(--cristal-text-faint)' }}
          >
            Selecciona un archivo para comenzar
          </span>
        </div>
      </div>
    </div>
  )
}
