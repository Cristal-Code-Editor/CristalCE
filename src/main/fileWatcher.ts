/**
 * File Watcher — monitoreo de cambios en el sistema de archivos del workspace.
 *
 * Usa fs.watch con opción recursive para detectar creación, modificación,
 * eliminación y renombrado de archivos/carpetas dentro del workspace.
 * Los eventos se envían al Renderer vía IPC para actualizar el explorador
 * y recargar archivos abiertos que cambiaron externamente.
 */
import { watch, type FSWatcher } from 'fs'
import { stat } from 'fs/promises'
import { join, dirname, normalize } from 'path'
import { type BrowserWindow } from 'electron'
import { IPC_CHANNELS } from './ipcChannels'

/* ── Tipos ──────────────────────────────────────────────── */

export interface FsWatchEvent {
  /** Tipo de evento del SO (rename = crear/eliminar/renombrar, change = modificar) */
  eventType: 'rename' | 'change'
  /** Ruta absoluta del archivo/carpeta afectada */
  filePath: string
  /** Directorio padre que necesita refrescarse en el explorador */
  parentDir: string
}

/* ── Estado global ─────────────────────────────────────── */

let activeWatcher: FSWatcher | null = null
let watchedRoot: string | null = null
let debounceMap = new Map<string, ReturnType<typeof setTimeout>>()

/* ── Directorios a ignorar ─────────────────────────────── */

const IGNORED_SEGMENTS = new Set([
  'node_modules', '.git', '.cristalce', 'dist', 'build', '.next', 'out',
  '.cache', '.turbo', '.parcel-cache', '__pycache__', '.pytest_cache',
])

function shouldIgnore(relativePath: string): boolean {
  const segments = relativePath.replace(/\\/g, '/').split('/')
  return segments.some((s) => IGNORED_SEGMENTS.has(s))
}

/* ── API pública ───────────────────────────────────────── */

/**
 * Inicia el monitoreo recursivo de un directorio raíz.
 * Cualquier watcher previo se destruye automáticamente.
 */
export function startWatching(rootPath: string, window: BrowserWindow): void {
  stopWatching()

  watchedRoot = normalize(rootPath)

  try {
    activeWatcher = watch(rootPath, { recursive: true }, (eventType, filename) => {
      if (!filename || !watchedRoot) return

      // Filtrar directorios ignorados
      if (shouldIgnore(filename)) return

      const filePath = normalize(join(watchedRoot, filename))
      const parentDir = dirname(filePath)

      // Debounce: agrupar eventos rápidos del mismo archivo (50ms)
      const key = `${eventType}:${filePath}`
      const existing = debounceMap.get(key)
      if (existing) clearTimeout(existing)

      debounceMap.set(
        key,
        setTimeout(() => {
          debounceMap.delete(key)

          const event: FsWatchEvent = {
            eventType: eventType as 'rename' | 'change',
            filePath,
            parentDir,
          }

          // Enviar al Renderer solo si la ventana sigue activa
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.FS_WATCH_EVENT, event)
          }
        }, 50),
      )
    })

    activeWatcher.on('error', (err) => {
      console.error('[FileWatcher] Error en watcher:', err)
    })
  } catch (err) {
    console.error('[FileWatcher] No se pudo iniciar watcher:', err)
  }
}

/**
 * Detiene el monitoreo activo y limpia recursos.
 */
export function stopWatching(): void {
  if (activeWatcher) {
    activeWatcher.close()
    activeWatcher = null
  }
  watchedRoot = null

  // Limpiar debounce timers pendientes
  for (const timer of debounceMap.values()) {
    clearTimeout(timer)
  }
  debounceMap = new Map()
}
