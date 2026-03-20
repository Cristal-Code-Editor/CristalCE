import { app, BrowserWindow, ipcMain, Menu, dialog, shell, clipboard, type MenuItemConstructorOptions } from 'electron'
import { join, dirname, basename } from 'path'
import { readFile, writeFile, readdir, mkdir, rename, rm } from 'fs/promises'
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

ipcMain.on('popup-app-menu', (_event, menuLabel: string, x: number, y: number) => {
  const appMenu = Menu.getApplicationMenu()
  const target = appMenu?.items.find((item) => item.label === menuLabel)
  if (target?.submenu && mainWindow) {
    target.submenu.popup({ window: mainWindow, x: Math.round(x), y: Math.round(y) })
  }
})

// ─── IPC: File System Operations ──────────────────────────────────────────────

/** Estructura de una entrada de directorio enviada al Renderer. */
interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
}

ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_event, filePath: string): Promise<string> => {
  return readFile(filePath, 'utf-8')
})

ipcMain.handle(
  IPC_CHANNELS.FS_WRITE_FILE,
  async (_event, filePath: string, content: string): Promise<void> => {
    await writeFile(filePath, content, 'utf-8')
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_READ_DIRECTORY,
  async (_event, dirPath: string): Promise<DirEntry[]> => {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const result: DirEntry[] = []
    for (const entry of entries) {
      // Ocultar archivos/carpetas ocultas (dotfiles) y node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      result.push({
        name: entry.name,
        path: join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      })
    }
    // Carpetas primero, luego archivos, ambos alfabéticos
    result.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return result
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_CREATE_FILE,
  async (_event, filePath: string): Promise<void> => {
    // Crear directorios intermedios si no existen
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, '', 'utf-8')
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_CREATE_DIRECTORY,
  async (_event, dirPath: string): Promise<void> => {
    await mkdir(dirPath, { recursive: true })
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_RENAME,
  async (_event, oldPath: string, newName: string): Promise<string> => {
    const newPath = join(dirname(oldPath), newName)
    await rename(oldPath, newPath)
    return newPath
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_DELETE,
  async (_event, targetPath: string): Promise<void> => {
    await rm(targetPath, { recursive: true })
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_MOVE,
  async (_event, sourcePath: string, destDir: string): Promise<string> => {
    const newPath = join(destDir, basename(sourcePath))
    await rename(sourcePath, newPath)
    return newPath
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_REVEAL_IN_EXPLORER,
  async (_event, targetPath: string): Promise<void> => {
    shell.showItemInFolder(targetPath)
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_COPY_PATH,
  async (_event, targetPath: string): Promise<void> => {
    clipboard.writeText(targetPath)
  },
)

ipcMain.handle(
  IPC_CHANNELS.FS_SAVE_DIALOG,
  async (_event, defaultPath?: string): Promise<string | null> => {
    if (!mainWindow) return null

    // Detectar extensión del archivo sugerido para priorizar el filtro correcto
    const ext = defaultPath?.split('.').pop()?.toLowerCase() ?? ''

    // Filtros completos — el orden se reordena según la extensión detectada
    const allFilters: Array<{ name: string; extensions: string[] }> = [
      { name: 'TypeScript', extensions: ['ts', 'mts', 'cts'] },
      { name: 'TypeScript React', extensions: ['tsx'] },
      { name: 'JavaScript', extensions: ['js', 'mjs', 'cjs'] },
      { name: 'JavaScript React', extensions: ['jsx'] },
      { name: 'JSON', extensions: ['json', 'jsonc'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'CSS', extensions: ['css'] },
      { name: 'SCSS', extensions: ['scss'] },
      { name: 'Less', extensions: ['less'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'Rust', extensions: ['rs'] },
      { name: 'Go', extensions: ['go'] },
      { name: 'Java', extensions: ['java'] },
      { name: 'C / C++', extensions: ['c', 'h', 'cpp', 'hpp'] },
      { name: 'C#', extensions: ['cs'] },
      { name: 'Ruby', extensions: ['rb'] },
      { name: 'PHP', extensions: ['php'] },
      { name: 'Shell', extensions: ['sh', 'bash'] },
      { name: 'PowerShell', extensions: ['ps1'] },
      { name: 'SQL', extensions: ['sql'] },
      { name: 'Markdown', extensions: ['md', 'mdx'] },
      { name: 'YAML', extensions: ['yaml', 'yml'] },
      { name: 'XML', extensions: ['xml'] },
      { name: 'Texto plano', extensions: ['txt'] },
    ]

    // Mover el filtro que coincida con la extensión al inicio
    const matchIdx = allFilters.findIndex((f) => f.extensions.includes(ext))
    const ordered =
      matchIdx > 0
        ? [allFilters[matchIdx], ...allFilters.slice(0, matchIdx), ...allFilters.slice(matchIdx + 1)]
        : allFilters

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [...ordered, { name: 'Todos los archivos', extensions: ['*'] }],
    })
    return result.canceled ? null : result.filePath ?? null
  },
)

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
