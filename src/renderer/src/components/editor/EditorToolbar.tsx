import { useState, useRef, useEffect, useCallback } from 'react'
import { CaretDown, Sparkle, Check, MagnifyingGlass, Play, Stop } from '@phosphor-icons/react'
import { SUPPORTED_LANGUAGES } from '../../utils/languageMap'

/* ── Props ─────────────────────────────────────────────── */

interface EditorToolbarProps {
  language: string
  runnable: boolean
  running: boolean
  onLanguageChange: (langId: string) => void
  onRequestCode: () => void
  onRun: () => void
  onStop: () => void
}

/* ── Selector de lenguaje con búsqueda ─────────────────── */

function LanguageSelector({
  language,
  onSelect,
}: {
  language: string
  onSelect: (langId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const currentLabel =
    SUPPORTED_LANGUAGES.find((l) => l.id === language)?.label ?? language

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Enfocar input al abrir y scroll al item activo
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    requestAnimationFrame(() => {
      listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' })
    })
  }, [open])

  const filtered = filter
    ? SUPPORTED_LANGUAGES.filter((l) =>
        l.label.toLowerCase().includes(filter.toLowerCase()),
      )
    : SUPPORTED_LANGUAGES

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
      setOpen(false)
      setFilter('')
    },
    [onSelect],
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cristal-lang-btn"
      >
        <span>{currentLabel}</span>
        <CaretDown
          size={8}
          weight="bold"
          style={{
            opacity: 0.4,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {open && (
        <div className="cristal-dropdown" style={{ width: 200 }}>
          <div className="relative">
            <MagnifyingGlass
              size={11}
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
              style={{ color: 'var(--cristal-text-faint)' }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="cristal-dropdown-search"
            />
          </div>

          <div ref={listRef} className="cristal-dropdown-list">
            {filtered.map((lang) => {
              const isActive = lang.id === language
              return (
                <button
                  key={lang.id}
                  type="button"
                  data-active={isActive}
                  onClick={() => handleSelect(lang.id)}
                  className="cristal-dropdown-item"
                  style={{
                    color: isActive ? 'var(--cristal-accent)' : 'var(--cristal-text-normal)',
                  }}
                >
                  <span className="flex-1 truncate text-left">{lang.label}</span>
                  {isActive && <Check size={11} weight="bold" style={{ color: 'var(--cristal-accent)', flexShrink: 0 }} />}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <span className="block px-3 py-3 text-center text-[11px]" style={{ color: 'var(--cristal-text-faint)' }}>
                Sin resultados
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Toolbar principal ─────────────────────────────────── */

export default function EditorToolbar({
  language,
  runnable,
  running,
  onLanguageChange,
  onRequestCode,
  onRun,
  onStop,
}: EditorToolbarProps) {
  return (
    <div className="cristal-editor-toolbar">
      {/* Selector de lenguaje — lado izquierdo */}
      <LanguageSelector language={language} onSelect={onLanguageChange} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Acciones — lado derecho */}
      <div className="cristal-toolbar__actions">
        {/* Ejecutar / Detener */}
        {runnable && (
          running ? (
            <button type="button" onClick={onStop} className="cristal-toolbar__btn cristal-toolbar__btn--stop" title="Detener ejecución">
              <Stop size={14} weight="fill" />
            </button>
          ) : (
            <button type="button" onClick={onRun} className="cristal-toolbar__btn cristal-toolbar__btn--run" title="Ejecutar código">
              <Play size={14} weight="fill" />
            </button>
          )
        )}

        {/* Separador visual */}
        {runnable && <span className="cristal-toolbar__divider" />}

        {/* Generar código */}
        <button type="button" onClick={onRequestCode} className="cristal-toolbar__btn cristal-toolbar__btn--gen" title="Generar código con IA">
          <Sparkle size={14} weight="fill" />
        </button>
      </div>
    </div>
  )
}
