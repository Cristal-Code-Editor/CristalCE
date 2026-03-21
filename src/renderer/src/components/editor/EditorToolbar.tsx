import { useState, useRef, useEffect, useCallback } from 'react'
import { CaretDown, Lightning, LightningSlash, Sparkle, Check, MagnifyingGlass } from '@phosphor-icons/react'
import { SUPPORTED_LANGUAGES } from '../../utils/languageMap'

/* ── Props ─────────────────────────────────────────────── */

interface EditorToolbarProps {
  language: string
  aiEnabled: boolean
  onLanguageChange: (langId: string) => void
  onAiToggle: () => void
  onRequestCode: () => void
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
    // Scroll al lenguaje seleccionado
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
        className="cristal-toolbar-btn"
      >
        <span className="truncate" style={{ maxWidth: 90 }}>{currentLabel}</span>
        <CaretDown
          size={9}
          weight="bold"
          style={{
            opacity: 0.5,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {open && (
        <div className="cristal-dropdown" style={{ width: 220 }}>
          {/* Campo de búsqueda */}
          <div className="relative">
            <MagnifyingGlass
              size={12}
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
              style={{ color: 'var(--cristal-text-faint)' }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar lenguaje…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="cristal-dropdown-search"
            />
          </div>

          {/* Lista de opciones */}
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
                  {isActive && <Check size={12} weight="bold" style={{ color: 'var(--cristal-accent)', flexShrink: 0 }} />}
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
  aiEnabled,
  onLanguageChange,
  onAiToggle,
  onRequestCode,
}: EditorToolbarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-end gap-[2px] px-1.5 select-none"
      style={{
        height: 32,
        backgroundColor: 'var(--cristal-bg-editor)',
        borderBottom: '1px solid var(--cristal-border-subtle)',
      }}
    >
      {/* Generar código */}
      <button type="button" onClick={onRequestCode} className="cristal-toolbar-btn cristal-toolbar-btn--accent">
        <Sparkle size={12} weight="fill" />
        <span>Generar</span>
      </button>

      {/* Separador sutil */}
      <div style={{ width: 1, height: 14, backgroundColor: 'var(--cristal-border)', margin: '0 2px', flexShrink: 0 }} />

      {/* Toggle autocompletado AI */}
      <button
        type="button"
        onClick={onAiToggle}
        title={aiEnabled ? 'Desactivar autocompletado AI' : 'Activar autocompletado AI'}
        className={`cristal-toolbar-btn ${aiEnabled ? 'cristal-toolbar-btn--active' : ''}`}
      >
        {aiEnabled ? <Lightning size={12} weight="fill" /> : <LightningSlash size={12} weight="regular" />}
        <span>{aiEnabled ? 'AI' : 'AI'}</span>
      </button>

      {/* Selector de lenguaje */}
      <LanguageSelector language={language} onSelect={onLanguageChange} />
    </div>
  )
}
