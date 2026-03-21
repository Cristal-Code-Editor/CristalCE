import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { PaperPlaneRight, X, CircleNotch } from '@phosphor-icons/react'

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
      // Ctrl+Enter o Cmd+Enter para enviar
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="absolute inset-0 z-50 flex items-start justify-center pt-[15%]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    >
      <div
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-lg border"
        style={{
          backgroundColor: '#252526',
          borderColor: '#454545',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          animation: 'cristal-modal-in 0.15s ease-out',
        }}
      >
        {/* Cabecera */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid #333' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--cristal-accent)' }}>
            Generar código
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="flex items-center justify-center rounded"
            style={{
              width: 22,
              height: 22,
              color: '#969696',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#424242')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-col gap-2 p-3">
          <textarea
            ref={inputRef}
            rows={3}
            placeholder="Describe el código que necesitas..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={generating}
            className="resize-none rounded border px-2.5 py-2 text-[12px] outline-none"
            style={{
              backgroundColor: '#1e1e1e',
              borderColor: '#3a3a3c',
              color: 'var(--cristal-text-normal)',
              lineHeight: '1.5',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--cristal-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#3a3a3c')}
          />

          {error && (
            <span className="text-[11px]" style={{ color: '#f44747' }}>
              {error}
            </span>
          )}

          {/* Indicador de generación */}
          {generating && (
            <div
              className="flex items-center gap-2 px-1 text-[11px]"
              style={{ color: 'var(--cristal-accent)' }}
            >
              <CircleNotch size={14} className="cristal-spin" />
              Generando código...
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: '1px solid #333' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--cristal-text-faint)' }}>
            Ctrl+Enter para enviar
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!prompt.trim() || generating}
            className="flex items-center gap-1 rounded px-3 py-1 text-[11px] font-medium"
            style={{
              backgroundColor:
                prompt.trim() && !generating ? 'var(--cristal-accent)' : '#3a3a3c',
              color: prompt.trim() && !generating ? '#000' : '#666',
              transition: 'all 0.15s',
              cursor: prompt.trim() && !generating ? 'pointer' : 'default',
            }}
          >
            <PaperPlaneRight size={12} weight="bold" />
            Generar
          </button>
        </div>
      </div>
    </div>
  )
}
