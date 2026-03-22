/**
 * Instancia individual de terminal — renderiza un xterm.js conectado
 * a una sesión PTY del Main Process vía IPC.
 */

import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'

interface TerminalInstanceProps {
  /** ID de la sesión PTY en el Main Process */
  sessionId: string
  /** Si esta instancia está visible (pestaña activa) */
  visible: boolean
}

export default function TerminalInstance({ sessionId, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  // Crear terminal xterm al montar
  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      letterSpacing: 0.3,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true,
      theme: {
        background: '#1a1a1c',
        foreground: '#d4d4d4',
        cursor: '#00e5ff',
        cursorAccent: '#1a1a1c',
        selectionBackground: 'rgba(0, 229, 255, 0.15)',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#4ec9b0',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#00e5ff',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#4ec9b0',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#00e5ff',
        brightWhite: '#ffffff',
      },
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)

    // Intentar WebGL para rendimiento, fallback a canvas
    try {
      term.loadAddon(new WebglAddon())
    } catch {
      // WebGL no disponible, canvas funciona por defecto
    }

    fit.fit()

    // Notificar dimensiones iniciales al PTY
    window.cristalAPI.terminalResize(sessionId, term.cols, term.rows)

    // Teclado → PTY
    term.onData((data) => {
      window.cristalAPI.terminalWrite(sessionId, data)
    })

    termRef.current = term
    fitRef.current = fit

    return () => {
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [sessionId])

  // PTY → xterm (datos de salida)
  useEffect(() => {
    const unsub = window.cristalAPI.onTerminalData((id, data) => {
      if (id === sessionId) {
        termRef.current?.write(data)
      }
    })
    return unsub
  }, [sessionId])

  // Ajustar tamaño cuando se hace visible o cambia el contenedor
  useEffect(() => {
    if (!visible || !fitRef.current) return

    const doFit = () => {
      if (!fitRef.current || !termRef.current) return
      fitRef.current.fit()
      window.cristalAPI.terminalResize(sessionId, termRef.current.cols, termRef.current.rows)
    }

    // Fit tras un tick para que el DOM se estabilice
    const raf = requestAnimationFrame(doFit)

    const observer = new ResizeObserver(doFit)
    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [visible, sessionId])

  // Enfocar cuando se activa la pestaña
  useEffect(() => {
    if (visible) {
      termRef.current?.focus()
    }
  }, [visible])

  return (
    <div
      ref={containerRef}
      className="cristal-terminal__instance"
      style={{ display: visible ? 'block' : 'none' }}
    />
  )
}
