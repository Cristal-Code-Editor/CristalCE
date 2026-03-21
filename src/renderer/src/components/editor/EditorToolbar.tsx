import { useState, useRef, useEffect, useCallback } from 'react'
import { CaretDown, Lightning, LightningSlash, ChatText } from '@phosphor-icons/react'
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

  // Enfocar input al abrir
  useEffect(() => {
    if (open) inputRef.current?.focus()
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
        className="flex items-center gap-1 rounded px-2 py-1 text-[11px]"
        style={{
          color: 'var(--cristal-text-normal)',
          backgroundColor: 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = 'var(--cristal-bg-hover)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = 'transparent')
        }
      >
        {currentLabel}
        <CaretDown size={10} weight="bold" />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 z-50 mt-1 flex flex-col overflow-hidden rounded-md border"
          style={{
            backgroundColor: '#252526',
            borderColor: '#454545',
            width: 200,
            maxHeight: 260,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* Campo de búsqueda */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar lenguaje..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-b px-2 py-1.5 text-[11px] outline-none"
            style={{
              backgroundColor: '#1e1e1e',
              borderColor: '#454545',
              color: 'var(--cristal-text-normal)',
            }}
          />

          {/* Lista de opciones */}
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {filtered.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => handleSelect(lang.id)}
                className="flex w-full items-center px-2 py-1 text-left text-[11px]"
                style={{
                  color:
                    lang.id === language
                      ? 'var(--cristal-accent)'
                      : 'var(--cristal-text-normal)',
                  backgroundColor: 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--cristal-bg-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                {lang.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <span
                className="block px-2 py-2 text-center text-[11px]"
                style={{ color: 'var(--cristal-text-faint)' }}
              >
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
      className="flex shrink-0 items-center justify-between px-2 select-none"
      style={{
        height: 30,
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid var(--cristal-border-subtle)',
      }}
    >
      {/* Lado izquierdo: solicitar código */}
      <button
        type="button"
        onClick={onRequestCode}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px]"
        style={{
          color: 'var(--cristal-accent)',
          backgroundColor: 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = 'var(--cristal-accent-dim)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = 'transparent')
        }
      >
        <ChatText size={14} weight="duotone" />
        Generar código
      </button>

      {/* Lado derecho: toggle AI + selector de lenguaje */}
      <div className="flex items-center gap-1">
        {/* Toggle autocompletado AI */}
        <button
          type="button"
          onClick={onAiToggle}
          title={aiEnabled ? 'Desactivar autocompletado AI' : 'Activar autocompletado AI'}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px]"
          style={{
            color: aiEnabled ? 'var(--cristal-accent)' : 'var(--cristal-text-faint)',
            backgroundColor: 'transparent',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--cristal-bg-hover)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
        >
          {aiEnabled ? (
            <Lightning size={13} weight="fill" />
          ) : (
            <LightningSlash size={13} weight="regular" />
          )}
          {aiEnabled ? 'AI On' : 'AI Off'}
        </button>

        {/* Selector de lenguaje */}
        <LanguageSelector language={language} onSelect={onLanguageChange} />
      </div>
    </div>
  )
}
