import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { PaperPlaneRight, X, CircleNotch, Sparkle } from '@phosphor-icons/react'

/* ── Props ─────────────────────────────────────────────── */

interface CodePromptModalProps {
  language: string
  onClose: () => void
  onCodeGenerated: (code: string) => void
}

/* ── Componente ────────────────────────────────────────── */

export default function CodePromptModal({ language, onClose, onCodeGenerated }: CodePromptModalProps) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Enfocar textarea al abrir
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !generating) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, generating])

  // Cerrar al hacer clic en el backdrop
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current && !generating) onClose()
    },
    [onClose, generating],
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || generating) return

    setGenerating(true)
    setError(null)

    try {
      // Reutiliza el mismo canal AI con un prompt orientado a generación
      const generationPrompt =
        `// Language: ${language}\n// Task: ${trimmed}\n// Generate the code:\n`
      const result = await window.cristalAPI.requestCompletion(
        generationPrompt,
        language,
        trimmed,
      )
      if (result) {
        onCodeGenerated(result)
        onClose()
      } else {
        setError('No se recibió respuesta. Verifica tu conexión a internet.')
      }
    } catch {
      setError('Error al generar código. Intenta de nuevo.')
    } finally {
      setGenerating(false)
    }
  }, [prompt, generating, language, onCodeGenerated, onClose])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const canSubmit = prompt.trim().length > 0 && !generating

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="absolute inset-0 z-50 flex items-start justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingTop: '12%',
        animation: 'cristal-backdrop-in 0.2s ease-out',
      }}
    >
      <div
        className="cristal-modal flex w-full flex-col overflow-hidden"
        style={{ maxWidth: 540, animation: 'cristal-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Cabecera con línea de acento superior */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Sparkle size={14} weight="fill" style={{ color: 'var(--cristal-accent)' }} />
          <span className="flex-1 text-[12px] font-medium" style={{ color: 'var(--cristal-text-normal)' }}>
            Generar código
          </span>
          <span
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: 'var(--cristal-accent-dim)', color: 'var(--cristal-accent)' }}
          >
            AI
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="cristal-icon-btn"
          >
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-col gap-2.5 px-4 py-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              rows={3}
              placeholder="Describe qué código necesitas…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={generating}
              className="cristal-textarea"
            />
          </div>

          {error && (
            <div
              className="rounded-md px-2.5 py-1.5 text-[11px]"
              style={{ backgroundColor: 'rgba(244, 71, 71, 0.1)', color: '#f44747' }}
            >
              {error}
            </div>
          )}

          {/* Indicador de generación */}
          {generating && (
            <div className="flex items-center gap-2 py-0.5 text-[11px]" style={{ color: 'var(--cristal-accent)' }}>
              <CircleNotch size={13} className="cristal-spin" />
              <span>Generando…</span>
              <div className="ml-auto flex gap-[3px]">
                <span className="cristal-pulse-dot" style={{ animationDelay: '0ms' }} />
                <span className="cristal-pulse-dot" style={{ animationDelay: '150ms' }} />
                <span className="cristal-pulse-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--cristal-text-faint)' }}>
            <kbd className="cristal-kbd">Ctrl</kbd>
            <span>+</span>
            <kbd className="cristal-kbd">Enter</kbd>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`cristal-btn-primary ${canSubmit ? '' : 'cristal-btn-primary--disabled'}`}
          >
            {generating ? (
              <CircleNotch size={12} className="cristal-spin" />
            ) : (
              <PaperPlaneRight size={12} weight="bold" />
            )}
            <span>{generating ? 'Generando…' : 'Generar'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
