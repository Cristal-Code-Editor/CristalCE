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
 */
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
  /** Minimiza la ventana principal. */
  windowMinimize: () => void
  /** Alterna maximizar / restaurar la ventana principal. */
  windowMaximize: () => void
  /** Cierra la ventana principal. */
  windowClose: () => void
  /** Despliega un submenú nativo por su label (File, Edit, etc.). */
  popupMenu: (menuLabel: string) => void
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

  windowMinimize: () => {
    ipcRenderer.send('window-minimize')
  },

  windowMaximize: () => {
    ipcRenderer.send('window-maximize')
  },

  windowClose: () => {
    ipcRenderer.send('window-close')
  },

  popupMenu: (menuLabel: string) => {
    ipcRenderer.send('popup-app-menu', menuLabel)
  },

} satisfies CristalAPI)
