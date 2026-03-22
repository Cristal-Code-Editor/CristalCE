/**
 * Terminal Manager — gestión de sesiones PTY para la terminal integrada.
 *
 * Cada sesión es un pseudo-terminal real (node-pty) que ejecuta el shell
 * predeterminado del SO (PowerShell en Windows, bash/zsh en Unix).
 * Los datos fluyen vía IPC: Renderer → TERMINAL_WRITE → PTY → TERMINAL_DATA → Renderer.
 */

import { type BrowserWindow } from 'electron'
import { spawn as ptySpawn, type IPty } from 'node-pty'
import { platform, homedir } from 'os'
import { IPC_CHANNELS } from './ipcChannels'

/* ── Tipos ─────────────────────────────────────────────── */

export interface TerminalCreateOpts {
  /** Directorio de trabajo inicial. Si no se indica, usa home del usuario. */
  cwd?: string
  /** Columnas iniciales del terminal (default: 80) */
  cols?: number
  /** Filas iniciales del terminal (default: 24) */
  rows?: number
  /** Ruta absoluta del shell a ejecutar (ej. powershell.exe, cmd.exe, ruta custom). */
  shellPath?: string
  /** Argumentos para el shell. */
  shellArgs?: string[]
}

interface TerminalSession {
  pty: IPty
  id: string
}

/* ── Estado global ─────────────────────────────────────── */

const sessions = new Map<string, TerminalSession>()
let nextId = 1

/* ── Shell por defecto del SO ──────────────────────────── */

function defaultShell(): string {
  if (platform() === 'win32') {
    return process.env['COMSPEC'] || 'powershell.exe'
  }
  return process.env['SHELL'] || '/bin/bash'
}

/* ── API pública ───────────────────────────────────────── */

/**
 * Crea una nueva sesión PTY y conecta su salida al Renderer vía IPC.
 * Retorna el ID único de la sesión.
 */
export function createTerminal(
  window: BrowserWindow,
  opts: TerminalCreateOpts = {},
): string | null {
  const id = `term-${nextId++}`
  const cols = opts.cols ?? 80
  const rows = opts.rows ?? 24
  const cwd = opts.cwd ?? homedir()
  const shell = opts.shellPath ?? defaultShell()
  const shellArgs = opts.shellArgs ?? []

  // Inyectar espacio después del prompt en CMD para legibilidad
  const env = { ...process.env } as Record<string, string>
  const shellLower = shell.toLowerCase()
  if (shellLower.endsWith('cmd.exe') || shellLower.endsWith('cmd')) {
    env['PROMPT'] = '$P$G '
  }

  let pty: IPty
  try {
    pty = ptySpawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env,
    })
  } catch (err) {
    console.error('[TerminalManager] Error al crear sesión PTY:', err)
    return null
  }

  // Datos de salida del PTY → Renderer
  pty.onData((data) => {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.TERMINAL_DATA, id, data)
    }
  })

  // PTY terminó
  pty.onExit(({ exitCode }) => {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
    }
    sessions.delete(id)
  })

  sessions.set(id, { pty, id })
  return id
}

/**
 * Envía datos de teclado al PTY de una sesión existente.
 */
export function writeTerminal(id: string, data: string): void {
  sessions.get(id)?.pty.write(data)
}

/**
 * Redimensiona el PTY de una sesión existente (cols × rows).
 */
export function resizeTerminal(id: string, cols: number, rows: number): void {
  sessions.get(id)?.pty.resize(cols, rows)
}

/**
 * Destruye una sesión PTY y libera sus recursos.
 */
export function destroyTerminal(id: string): void {
  const session = sessions.get(id)
  if (!session) return
  session.pty.kill()
  sessions.delete(id)
}

/**
 * Destruye todas las sesiones PTY. Se invoca al cerrar la ventana.
 */
export function destroyAllTerminals(): void {
  for (const [, session] of sessions) {
    session.pty.kill()
  }
  sessions.clear()
}
