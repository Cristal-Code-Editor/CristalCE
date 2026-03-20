/**
 * Canales IPC utilizados para la comunicación Main ↔ Renderer.
 * Nomenclatura en UPPER_SNAKE_CASE según copilot.md §3.2.
 *
 * Cada canal representa una acción del menú nativo que el Main Process
 * emite hacia el Renderer a través del preload bridge (cristalAPI).
 */
export const IPC_CHANNELS = {
  /** Menú File → New File */
  FILE_NEW: 'FILE_NEW',
  /** Menú File → New Window */
  FILE_NEW_WINDOW: 'FILE_NEW_WINDOW',
  /** Menú File → Open File (envía ruta seleccionada por el usuario) */
  FILE_OPEN: 'FILE_OPEN',
  /** Menú File → Open Folder (envía ruta de carpeta seleccionada) */
  FILE_OPEN_FOLDER: 'FILE_OPEN_FOLDER',
  /** Menú File → Save */
  FILE_SAVE: 'FILE_SAVE',
  /** Menú File → Save As */
  FILE_SAVE_AS: 'FILE_SAVE_AS',
  /** Menú File → Save All */
  FILE_SAVE_ALL: 'FILE_SAVE_ALL',
  /** Menú File → Close Editor */
  FILE_CLOSE_EDITOR: 'FILE_CLOSE_EDITOR',
  /** Acción genérica del menú nativo → Renderer */
  MENU_ACTION: 'MENU_ACTION',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
