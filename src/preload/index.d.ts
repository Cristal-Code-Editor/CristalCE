import type { CristalAPI, DirEntry } from '../preload/index'

export type { DirEntry }

/**
 * Declaración global de la API inyectada por contextBridge.
 * Permite acceder a window.cristalAPI con tipado completo en el Renderer.
 */
declare global {
  interface Window {
    cristalAPI: CristalAPI
  }
}
