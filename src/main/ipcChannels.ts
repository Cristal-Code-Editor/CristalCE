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

  // ── File System Operations (invoke/handle) ──────────────
  /** Renderer → Main: leer contenido de un archivo */
  FS_READ_FILE: 'FS_READ_FILE',
  /** Renderer → Main: escribir contenido a un archivo */
  FS_WRITE_FILE: 'FS_WRITE_FILE',
  /** Renderer → Main: leer estructura de un directorio */
  FS_READ_DIRECTORY: 'FS_READ_DIRECTORY',
  /** Renderer → Main: diálogo "Guardar como…" retorna ruta seleccionada */
  FS_SAVE_DIALOG: 'FS_SAVE_DIALOG',
  /** Renderer → Main: crear un archivo vacío */
  FS_CREATE_FILE: 'FS_CREATE_FILE',
  /** Renderer → Main: crear un directorio */
  FS_CREATE_DIRECTORY: 'FS_CREATE_DIRECTORY',
  /** Renderer → Main: renombrar archivo o directorio */
  FS_RENAME: 'FS_RENAME',
  /** Renderer → Main: eliminar archivo o directorio */
  FS_DELETE: 'FS_DELETE',
  /** Renderer → Main: mover archivo/directorio a otro directorio */
  FS_MOVE: 'FS_MOVE',
  /** Renderer → Main: abrir ruta en el explorador del SO */
  FS_REVEAL_IN_EXPLORER: 'FS_REVEAL_IN_EXPLORER',
  /** Renderer → Main: copiar ruta al portapapeles */
  FS_COPY_PATH: 'FS_COPY_PATH',
  /** Renderer → Main: mostrar menú contextual nativo y retornar el ID seleccionado */
  SHOW_CONTEXT_MENU: 'SHOW_CONTEXT_MENU',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
