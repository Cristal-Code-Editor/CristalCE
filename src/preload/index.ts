import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type IpcChannel } from '../main/ipcChannels'

/**
 * API expuesta al Renderer Process vía contextBridge.
 * El Renderer NUNCA accede a Node.js directamente — solo a esta interfaz.
 *
 * Uso en el Renderer:
 *   window.cristalAPI.onMenuAction((action) => { ... })
 *   window.cristalAPI.onFileOpen((filePath) => { ... })
 *   window.cristalAPI.onFolderOpen((folderPath) => { ... })
 *   window.cristalAPI.readFile(path)
 *   window.cristalAPI.writeFile(path, content)
 *   window.cristalAPI.readDirectory(path)
 *   window.cristalAPI.showSaveDialog(defaultPath?)
 */

export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface CristalAPI {
  /**
   * Escucha acciones del menú nativo (New File, Save, Close Editor, etc.).
   * El Main Process envía el nombre del canal IPC como payload.
   */
  onMenuAction: (callback: (action: IpcChannel) => void) => () => void
  /**
   * Escucha cuando el usuario selecciona un archivo desde Open File.
   * Recibe la ruta absoluta del archivo.
   */
  onFileOpen: (callback: (filePath: string) => void) => () => void
  /**
   * Escucha cuando el usuario selecciona una carpeta desde Open Folder.
   * Recibe la ruta absoluta de la carpeta.
   */
  onFolderOpen: (callback: (folderPath: string) => void) => () => void

  // ── File System (invoke/handle) ─────────────────────────
  /** Lee contenido de un archivo como string UTF-8. */
  readFile: (filePath: string) => Promise<string>
  /** Escribe contenido string UTF-8 a un archivo. */
  writeFile: (filePath: string, content: string) => Promise<void>
  /** Lista entradas de un directorio (carpetas primero, sin dotfiles). */
  readDirectory: (dirPath: string) => Promise<DirEntry[]>
  /** Abre diálogo nativo "Guardar como…". Retorna ruta o null si cancela. */
  showSaveDialog: (defaultPath?: string) => Promise<string | null>
  /** Crea un archivo vacío en la ruta indicada (crea directorios intermedios). */
  createFile: (filePath: string) => Promise<void>
  /** Crea un directorio en la ruta indicada (recursive). */
  createDirectory: (dirPath: string) => Promise<void>
  /** Renombra un archivo o directorio. Retorna la nueva ruta absoluta. */
  renamePath: (oldPath: string, newName: string) => Promise<string>
  /** Elimina un archivo o directorio (recursivo). */
  deletePath: (targetPath: string) => Promise<void>
  /** Mueve un archivo/directorio a otro directorio. Retorna nueva ruta. */
  movePath: (sourcePath: string, destDir: string) => Promise<string>
  /** Abre la ubicación del archivo/carpeta en el explorador del SO. */
  revealInExplorer: (targetPath: string) => Promise<void>
  /** Copia la ruta al portapapeles del SO. */
  copyPath: (targetPath: string) => Promise<void>
  /** Muestra un menú contextual nativo y retorna el id del item seleccionado (o null). */
  showContextMenu: (items: { id: string; label: string; accelerator?: string; separator?: boolean }[]) => Promise<string | null>
  /** Abre el diálogo nativo para seleccionar carpeta. */
  openFolderDialog: () => Promise<void>

  /** Minimiza la ventana principal. */
  windowMinimize: () => void
  /** Alterna maximizar / restaurar la ventana principal. */
  windowMaximize: () => void
  /** Cierra la ventana principal. */
  windowClose: () => void
  /** Despliega un submenú nativo por su label posicionado en (x, y). */
  popupMenu: (menuLabel: string, x: number, y: number) => void
}

// ─── Exposición segura al Renderer ────────────────────────────────────────────
// contextBridge.exposeInMainWorld inyecta `cristalAPI` en window.
// El Renderer NO tiene acceso a ipcRenderer ni a ningún módulo de Node.

contextBridge.exposeInMainWorld('cristalAPI', {

  onMenuAction: (callback: (action: IpcChannel) => void) => {
    // Listener: Main → Renderer al hacer clic en opción del menú nativo
    const handler = (_event: Electron.IpcRendererEvent, action: IpcChannel) => callback(action)
    ipcRenderer.on(IPC_CHANNELS.MENU_ACTION, handler)

    // Retorna función de limpieza para desuscribirse
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_ACTION, handler)
    }
  },

  onFileOpen: (callback: (filePath: string) => void) => {
    // Listener: Main → Renderer cuando el usuario selecciona archivo en Open File
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
    ipcRenderer.on(IPC_CHANNELS.FILE_OPEN, handler)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.FILE_OPEN, handler)
    }
  },

  onFolderOpen: (callback: (folderPath: string) => void) => {
    // Listener: Main → Renderer cuando el usuario selecciona carpeta en Open Folder
    const handler = (_event: Electron.IpcRendererEvent, folderPath: string) => callback(folderPath)
    ipcRenderer.on(IPC_CHANNELS.FILE_OPEN_FOLDER, handler)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.FILE_OPEN_FOLDER, handler)
    }
  },

  // ── File System Operations ──────────────────────────────
  readFile: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, filePath)
  },

  writeFile: (filePath: string, content: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content)
  },

  readDirectory: (dirPath: string): Promise<DirEntry[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIRECTORY, dirPath)
  },

  showSaveDialog: (defaultPath?: string): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_SAVE_DIALOG, defaultPath)
  },

  createFile: (filePath: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_FILE, filePath)
  },

  createDirectory: (dirPath: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_DIRECTORY, dirPath)
  },

  renamePath: (oldPath: string, newName: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME, oldPath, newName)
  },

  deletePath: (targetPath: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE, targetPath)
  },

  movePath: (sourcePath: string, destDir: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_MOVE, sourcePath, destDir)
  },

  revealInExplorer: (targetPath: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_REVEAL_IN_EXPLORER, targetPath)
  },

  copyPath: (targetPath: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FS_COPY_PATH, targetPath)
  },

  showContextMenu: (items: { id: string; label: string; accelerator?: string; separator?: boolean }[]): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SHOW_CONTEXT_MENU, items)
  },

  openFolderDialog: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER)
  },

  windowMinimize: () => {
    ipcRenderer.send('window-minimize')
  },

  windowMaximize: () => {
    ipcRenderer.send('window-maximize')
  },

  windowClose: () => {
    ipcRenderer.send('window-close')
  },

  popupMenu: (menuLabel: string, x: number, y: number) => {
    ipcRenderer.send('popup-app-menu', menuLabel, x, y)
  },

} satisfies CristalAPI)
