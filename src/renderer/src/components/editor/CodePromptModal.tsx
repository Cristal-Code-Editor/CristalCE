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

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !generating) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, generating])

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
        setError('Sin respuesta — revisa tu conexión.')
      }
    } catch {
      setError('Error al generar. Intenta de nuevo.')
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
      className="cristal-prompt-backdrop"
    >
      <div className="cristal-prompt">
        {/* Barra de entrada principal */}
        <div className="cristal-prompt__input-row">
          <Sparkle size={14} weight="fill" className="cristal-prompt__icon" />

          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Describe qué código necesitas…"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              // Auto-resize
              const el = e.target
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            disabled={generating}
            className="cristal-prompt__textarea"
          />

          {!generating && (
            <button
              type="button"
              onClick={onClose}
              className="cristal-prompt__close"
            >
              <X size={13} weight="bold" />
            </button>
          )}
        </div>

        {/* Estado de generación */}
        {generating && (
          <div className="cristal-prompt__status">
            <CircleNotch size={12} className="cristal-spin" />
            <span>Generando código…</span>
            <div className="cristal-prompt__dots">
              <span style={{ animationDelay: '0ms' }} />
              <span style={{ animationDelay: '150ms' }} />
              <span style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="cristal-prompt__error">{error}</div>
        )}

        {/* Barra de acciones */}
        <div className="cristal-prompt__actions">
          <span className="cristal-prompt__hint">
            <kbd>Ctrl</kbd><span>+</span><kbd>Enter</kbd>
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`cristal-prompt__submit ${canSubmit ? '' : 'cristal-prompt__submit--disabled'}`}
          >
            {generating ? (
              <CircleNotch size={11} className="cristal-spin" />
            ) : (
              <PaperPlaneRight size={11} weight="fill" />
            )}
            <span>Generar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
