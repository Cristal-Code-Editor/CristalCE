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
  /** Renderer → Main: abrir diálogo nativo de selección de carpeta */
  DIALOG_OPEN_FOLDER: 'DIALOG_OPEN_FOLDER',

  // ── AI Completions (invoke/handle) ──────────────────────
  /** Renderer → Main: solicitar autocompletado de código vía proxy AI */
  AI_COMPLETION: 'AI_COMPLETION',

  // ── Code Execution (invoke/handle + send) ───────────────
  /** Renderer → Main: ejecutar código en un proceso hijo */
  RUN_CODE: 'RUN_CODE',
  /** Renderer → Main: matar el proceso hijo activo */
  STOP_CODE: 'STOP_CODE',
  /** Main → Renderer: fragmento de stdout del proceso */
  CODE_STDOUT: 'CODE_STDOUT',
  /** Main → Renderer: fragmento de stderr del proceso */
  CODE_STDERR: 'CODE_STDERR',
  /** Main → Renderer: el proceso terminó (exitCode) */
  CODE_EXIT: 'CODE_EXIT',

  // ── Runtime Manager (invoke/handle + send) ──────────────
  /** Renderer → Main: obtener versiones de Node.js disponibles para descarga */
  RUNTIME_LIST_AVAILABLE: 'RUNTIME_LIST_AVAILABLE',
  /** Renderer → Main: obtener versiones instaladas localmente */
  RUNTIME_LIST_INSTALLED: 'RUNTIME_LIST_INSTALLED',
  /** Renderer → Main: descargar e instalar una versión específica */
  RUNTIME_INSTALL: 'RUNTIME_INSTALL',
  /** Renderer → Main: desinstalar una versión */
  RUNTIME_UNINSTALL: 'RUNTIME_UNINSTALL',
  /** Renderer → Main: obtener la versión activa para ejecución */
  RUNTIME_GET_ACTIVE: 'RUNTIME_GET_ACTIVE',
  /** Renderer → Main: establecer la versión activa */
  RUNTIME_SET_ACTIVE: 'RUNTIME_SET_ACTIVE',
  /** Main → Renderer: progreso de descarga (0-100) */
  RUNTIME_INSTALL_PROGRESS: 'RUNTIME_INSTALL_PROGRESS',

  // ── Terminal Integrada (invoke/handle + send) ───────────
  /** Renderer → Main: crear una nueva sesión de terminal */
  TERMINAL_CREATE: 'TERMINAL_CREATE',
  /** Renderer → Main: enviar datos de teclado al PTY */
  TERMINAL_WRITE: 'TERMINAL_WRITE',
  /** Renderer → Main: redimensionar el PTY (cols, rows) */
  TERMINAL_RESIZE: 'TERMINAL_RESIZE',
  /** Renderer → Main: destruir una sesión de terminal */
  TERMINAL_DESTROY: 'TERMINAL_DESTROY',
  /** Main → Renderer: datos de salida del PTY */
  TERMINAL_DATA: 'TERMINAL_DATA',
  /** Main → Renderer: la sesión PTY terminó (exitCode) */
  TERMINAL_EXIT: 'TERMINAL_EXIT',
  /** Renderer → Main: abrir diálogo para seleccionar ejecutable de shell */
  TERMINAL_SELECT_SHELL: 'TERMINAL_SELECT_SHELL',

  // ── Settings & Persistence (invoke/handle) ──────────────
  /** Renderer → Main: obtener configuración global */
  SETTINGS_GET: 'SETTINGS_GET',
  /** Renderer → Main: actualizar configuración global (merge parcial) */
  SETTINGS_SET: 'SETTINGS_SET',
  /** Renderer → Main: obtener estado del workspace (tabs, layout) */
  WORKSPACE_STATE_GET: 'WORKSPACE_STATE_GET',
  /** Renderer → Main: guardar estado del workspace */
  WORKSPACE_STATE_SET: 'WORKSPACE_STATE_SET',
  /** Renderer → Main: registrar un workspace en la lista de recientes */
  SETTINGS_ADD_RECENT: 'SETTINGS_ADD_RECENT',

  // ── TypeScript Intelligence (invoke/handle) ─────────────
  /** Renderer → Main: obtener tsconfig.json + lista de archivos TS del proyecto */
  TS_GET_CONFIG: 'TS_GET_CONFIG',
  /** Renderer → Main: obtener type definitions de node_modules */
  TS_GET_TYPE_LIBS: 'TS_GET_TYPE_LIBS',
  /** Renderer → Main: obtener fuentes del proyecto para cross-file awareness */
  TS_GET_PROJECT_SOURCES: 'TS_GET_PROJECT_SOURCES',

  // ── File System Watcher (invoke/handle + send) ──────────
  /** Renderer → Main: iniciar monitoreo recursivo de un directorio */
  FS_WATCH_START: 'FS_WATCH_START',
  /** Renderer → Main: detener monitoreo activo */
  FS_WATCH_STOP: 'FS_WATCH_STOP',
  /** Main → Renderer: evento de cambio detectado en el filesystem */
  FS_WATCH_EVENT: 'FS_WATCH_EVENT',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
