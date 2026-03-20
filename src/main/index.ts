import { app, BrowserWindow, ipcMain, Menu, dialog, shell, type MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from './ipcChannels'

/**
 * Referencia global a la ventana principal.
 * Se mantiene para evitar que el garbage collector la destruya.
 */
let mainWindow: BrowserWindow | null = null

/**
 * Crea la ventana principal de CristalCE.
 * - nodeIntegration DESACTIVADO (seguridad IPC estricta según copilot.md).
 * - contextIsolation ACTIVADO: el Renderer solo accede a cristalAPI vía preload.
 * - sandbox ACTIVADO: máxima aislación del proceso renderer.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    title: 'CristalCE',
    // Header personalizado en el Renderer — sin barra de título nativa
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Mostrar ventana cuando el contenido esté listo (evita flash blanco)
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Abrir enlaces externos en el navegador del SO (no dentro de Electron)
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Construir y aplicar el menú nativo
  const menuTemplate = buildMenuTemplate(mainWindow)
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // Cargar la UI del Renderer (HMR en dev, archivo estático en producción)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── Menú Nativo ──────────────────────────────────────────────────────────────

/**
 * Construye el template del menú nativo de la aplicación.
 * Las acciones del menú se comunican al Renderer vía IPC (webContents.send).
 *
 * @param window - Ventana principal para enviar eventos IPC al Renderer.
 * @returns Template compatible con Menu.buildFromTemplate.
 */
function buildMenuTemplate(window: BrowserWindow): MenuItemConstructorOptions[] {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // IPC → Renderer: solicita creación de archivo nuevo
            window.webContents.send(IPC_CHANNELS.MENU_ACTION, IPC_CHANNELS.FILE_NEW)
          },
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            // IPC → Renderer: solicita apertura de nueva ventana
            window.webContents.send(IPC_CHANNELS.MENU_ACTION, IPC_CHANNELS.FILE_NEW_WINDOW)
          },
        },
        { type: 'separator' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            // Diálogo nativo del SO para seleccionar archivo
            const result = await dialog.showOpenDialog(window, {
              properties: ['openFile'],
              filters: [
                { name: 'Todos los archivos', extensions: ['*'] },
                { name: 'TypeScript', extensions: ['ts', 'tsx'] },
                { name: 'JavaScript', extensions: ['js', 'jsx'] },
                { name: 'JSON', extensions: ['json'] },
                { name: 'HTML', extensions: ['html', 'htm'] },
                { name: 'CSS', extensions: ['css'] },
              ],
            })

            if (!result.canceled && result.filePaths.length > 0) {
              // IPC → Renderer: envía la ruta del archivo seleccionado
              window.webContents.send(IPC_CHANNELS.FILE_OPEN, result.filePaths[0])
            }
          },
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+K CmdOrCtrl+O',
          click: async () => {
            // Diálogo nativo del SO para seleccionar carpeta
            const result = await dialog.showOpenDialog(window, {
              properties: ['openDirectory'],
            })

            if (!result.canceled && result.filePaths.length > 0) {
              // IPC → Renderer: envía la ruta de la carpeta seleccionada
              window.webContents.send(IPC_CHANNELS.FILE_OPEN_FOLDER, result.filePaths[0])
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            // IPC → Renderer: solicita guardar el archivo activo
            window.webContents.send(IPC_CHANNELS.MENU_ACTION, IPC_CHANNELS.FILE_SAVE)
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            // IPC → Renderer: solicita "Guardar como"
            window.webContents.send(IPC_CHANNELS.MENU_ACTION, IPC_CHANNELS.FILE_SAVE_AS)
          },
        },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+K S',
          click: () => {
            // IPC → Renderer: solicita guardar todos los archivos abiertos
            window.webContents.send(IPC_CHANNELS.MENU_ACTION, IPC_CHANNELS.FILE_SAVE_ALL)
          },
        },
        { type: 'separator' },
        {
          label: 'Close Editor',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            // IPC → Renderer: solicita cerrar el editor/pestaña activa
            window.webContents.send(IPC_CHANNELS.MENU_ACTION, IPC_CHANNELS.FILE_CLOSE_EDITOR)
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit()
          },
        },
      ],
    },
  ]
}

// ─── Ciclo de vida de Electron ────────────────────────────────────────────────

// ─── IPC: Controles de Ventana ──────────────────────────────────────────────

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

app.whenReady().then(() => {
  createWindow()

  // macOS: re-crear ventana si se activa la app sin ventanas abiertas
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // En macOS la app permanece activa hasta Cmd+Q explícito
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
