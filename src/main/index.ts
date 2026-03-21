import { app, BrowserWindow, ipcMain, Menu, dialog, shell, clipboard, net, type MenuItemConstructorOptions } from 'electron'
import { join, dirname, basename } from 'path'
import { readFile, writeFile, readdir, mkdir, rename, rm, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { spawn, type ChildProcess } from 'child_process'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from './ipcChannels'
import {
  listAvailableVersions,
  listInstalledVersions,
  installVersion,
  uninstallVersion,
  getActiveVersion,
  setActiveVersion,
  resolveNodeBinary,
} from './runtimeManager'

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
          accelerator: 'CmdOrCtrl+Shift+O',
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
          accelerator: 'CmdOrCtrl+Alt+S',
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

// ─── IPC: Menú contextual nativo ──────────────────────────────────────────────

interface ContextMenuItemDef {
  id: string
  label: string
  accelerator?: string
  separator?: boolean
}

ipcMain.handle(
  IPC_CHANNELS.SHOW_CONTEXT_MENU,
  async (_event, items: ContextMenuItemDef[]): Promise<string | null> => {
    if (!mainWindow) return null

    return new Promise((resolve) => {
      let resolved = false

      const template = items.map((item) => {
        if (item.separator) {
          return { type: 'separator' as const }
        }
        return {
          label: item.label,
          accelerator: item.accelerator,
          click: () => {
            resolved = true
            resolve(item.id)
          },
        }
      })

      const menu = Menu.buildFromTemplate(template)
      menu.popup({
        window: mainWindow!,
        callback: () => {
          // Se llama cuando el menú se cierra (por selección o dismiss)
          if (!resolved) resolve(null)
        },
      })
    })
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

// ─── IPC: Diálogo nativo de selección de carpeta ──────────────────────────────

ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async () => {
  if (!mainWindow) return

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send(IPC_CHANNELS.FILE_OPEN_FOLDER, result.filePaths[0])
  }
})

// ─── IPC: AI Completions vía proxy → CF Worker → NVIDIA ──────────────────────

/** URL del proxy API y token JWT para autenticar peticiones al backend. */
const AI_API_URL = 'https://api.cristalce.com'
let aiAuthToken: string | null = null
let aiTokenExpiry = 0

/**
 * Estado de conectividad del proxy AI.
 * Cuando una solicitud falla por red, se marca offline y se inicia un
 * sondeo periódico al health-check para reactivar el servicio.
 */
let aiOnline = true
let aiRetryTimer: ReturnType<typeof setInterval> | null = null
const AI_RETRY_INTERVAL = 30_000 // 30 s entre reintentos de reconexión

/** Detiene el sondeo periódico de salud del proxy AI. */
function stopAiRetry(): void {
  if (aiRetryTimer) {
    clearInterval(aiRetryTimer)
    aiRetryTimer = null
  }
}

/**
 * Inicia un sondeo periódico al endpoint /health del proxy.
 * Cuando la respuesta es 200, restaura aiOnline y detiene el sondeo.
 */
function startAiRetry(): void {
  if (aiRetryTimer) return
  aiRetryTimer = setInterval(async () => {
    // Si Electron sabe que no hay red, ni intenta
    if (!net.isOnline()) return
    try {
      const res = await net.fetch(`${AI_API_URL}/health`, { method: 'GET' })
      if (res.ok) {
        aiOnline = true
        stopAiRetry()
      }
    } catch {
      // Sigue sin conectividad, el timer continúa
    }
  }, AI_RETRY_INTERVAL)
}

/**
 * Obtiene o renueva el token JWT del proxy.
 * El token expira en 24h; se renueva con 1 hora de margen.
 */
async function getAiToken(): Promise<string> {
  const now = Date.now()
  if (aiAuthToken && now < aiTokenExpiry) return aiAuthToken

  const res = await net.fetch(`${AI_API_URL}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'editor@cristalce.com' }),
  })

  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)

  const data = (await res.json()) as { token: string }
  aiAuthToken = data.token
  // Renovar 1 hora antes de que expire (token dura 24h)
  aiTokenExpiry = now + 23 * 60 * 60 * 1000
  return aiAuthToken
}

/** Payload que el Renderer envía para solicitar autocompletado. */
interface AiCompletionRequest {
  prompt: string
  language: string
  context?: string
}

ipcMain.handle(
  IPC_CHANNELS.AI_COMPLETION,
  async (_event, req: AiCompletionRequest): Promise<string> => {
    // Sin conexión a internet o proxy caído → respuesta vacía inmediata
    if (!net.isOnline() || !aiOnline) return ''

    try {
      const token = await getAiToken()

      const res = await net.fetch(`${AI_API_URL}/v1/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: req.prompt,
          language: req.language,
          context: req.context,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`AI completion failed (${res.status}): ${body}`)
      }

      const data = (await res.json()) as { completion: string }
      return data.completion
    } catch {
      // Fallo de red → marcar offline e iniciar sondeo periódico
      aiOnline = false
      startAiRetry()
      return ''
    }
  },
)

// ─── IPC: Ejecución de código (child_process) ────────────────────────────────

/** Proceso hijo activo. Solo uno a la vez por seguridad. */
let runningProcess: ChildProcess | null = null

/** Lenguajes soportados y el runtime que usan */
const RUNNABLE_LANGUAGES: Record<string, string> = {
  javascript: 'node',
  typescript: 'node',
}

/** Extensiones de archivo temporal según lenguaje */
const LANG_EXT: Record<string, string> = {
  javascript: '.js',
  typescript: '.js',
}

ipcMain.handle(
  IPC_CHANNELS.RUN_CODE,
  async (_event, code: string, language: string): Promise<void> => {
    if (!mainWindow) return

    // Matar proceso previo si existe
    if (runningProcess) {
      runningProcess.kill()
      runningProcess = null
    }

    const runtime = RUNNABLE_LANGUAGES[language]
    if (!runtime) {
      mainWindow.webContents.send(IPC_CHANNELS.CODE_STDERR, `Lenguaje "${language}" no soportado para ejecución.\n`)
      mainWindow.webContents.send(IPC_CHANNELS.CODE_EXIT, 1)
      return
    }

    // Escribir código a archivo temporal
    const tmpDir = await mkdtemp(join(tmpdir(), 'cristalce-'))
    const ext = LANG_EXT[language] ?? '.js'
    const tmpFile = join(tmpDir, `script${ext}`)
    await writeFile(tmpFile, code, 'utf-8')

    // Resolver el binario de Node.js (embebido o descargado)
    const { bin, env: runtimeEnv } = await resolveNodeBinary()
    const args = [tmpFile]

    const child = spawn(bin, args, {
      cwd: tmpDir,
      env: { ...process.env, ...runtimeEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    runningProcess = child
    const win = mainWindow

    child.stdout?.on('data', (chunk: Buffer) => {
      win.webContents.send(IPC_CHANNELS.CODE_STDOUT, chunk.toString('utf-8'))
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      win.webContents.send(IPC_CHANNELS.CODE_STDERR, chunk.toString('utf-8'))
    })

    child.on('close', async (exitCode) => {
      win.webContents.send(IPC_CHANNELS.CODE_EXIT, exitCode ?? 1)
      runningProcess = null
      // Limpiar archivo temporal
      await rm(tmpDir, { recursive: true }).catch(() => {})
    })

    child.on('error', async (err) => {
      win.webContents.send(IPC_CHANNELS.CODE_STDERR, `Error: ${err.message}\n`)
      win.webContents.send(IPC_CHANNELS.CODE_EXIT, 1)
      runningProcess = null
      await rm(tmpDir, { recursive: true }).catch(() => {})
    })
  },
)

ipcMain.handle(IPC_CHANNELS.STOP_CODE, async () => {
  if (runningProcess) {
    runningProcess.kill()
    runningProcess = null
  }
})

// ─── IPC: Runtime Version Manager ────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.RUNTIME_LIST_AVAILABLE, async () => {
  return listAvailableVersions()
})

ipcMain.handle(IPC_CHANNELS.RUNTIME_LIST_INSTALLED, async () => {
  return listInstalledVersions()
})

ipcMain.handle(IPC_CHANNELS.RUNTIME_INSTALL, async (_event, version: string) => {
  if (!mainWindow) return
  await installVersion(version, mainWindow)
})

ipcMain.handle(IPC_CHANNELS.RUNTIME_UNINSTALL, async (_event, version: string) => {
  await uninstallVersion(version)
})

ipcMain.handle(IPC_CHANNELS.RUNTIME_GET_ACTIVE, async () => {
  return getActiveVersion()
})

ipcMain.handle(IPC_CHANNELS.RUNTIME_SET_ACTIVE, async (_event, version: string) => {
  await setActiveVersion(version)
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
