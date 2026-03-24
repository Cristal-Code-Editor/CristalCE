/**
 * Runtime Manager — descarga y gestión de versiones de Node.js.
 *
 * Almacena binarios en: {userData}/runtimes/node/{version}/node.exe
 * La versión activa se persiste en: {userData}/runtimes/active.json
 *
 * Usa "embedded" como valor especial para el Node integrado de Electron.
 */

import { app, net, type BrowserWindow } from 'electron'
import { join } from 'path'
import { mkdir, readdir, rm, readFile, writeFile, stat } from 'fs/promises'
import { createWriteStream } from 'fs'
import { IPC_CHANNELS } from './ipcChannels'

/* ── Tipos públicos ────────────────────────────────────── */

export interface NodeVersion {
  version: string // "v22.14.0"
  lts: string | false // "Jod" o false
  date: string
}

export interface InstalledRuntime {
  version: string // "v22.14.0" o "embedded"
  label: string
  path: string // ruta al binario
}

/* ── Rutas ─────────────────────────────────────────────── */

const runtimesDir = (): string => join(app.getPath('userData'), 'runtimes', 'node')
const activeFile = (): string => join(app.getPath('userData'), 'runtimes', 'active.json')

/* ── Validación de versión ─────────────────────────────── */

/**
 * Expresión regular para versiones Node.js válidas: v<major>.<minor>.<patch>
 * Previene path traversal al usar la versión en rutas de sistema de archivos.
 */
const VERSION_RE = /^v\d+\.\d+\.\d+$/

/**
 * Lanza un error si la versión no cumple el formato semántico de Node.js.
 * Protege contra path traversal en rutas construidas a partir de la versión.
 */
function assertValidVersion(version: string): void {
  if (!VERSION_RE.test(version)) {
    throw new Error(`Versión inválida: "${version}". Formato esperado: v<major>.<minor>.<patch>`)
  }
}

/* ── Versiones disponibles (nodejs.org) ────────────────── */

export async function listAvailableVersions(): Promise<NodeVersion[]> {
  const res = await net.fetch('https://nodejs.org/dist/index.json')
  if (!res.ok) throw new Error(`nodejs.org respondió ${res.status}`)

  const all = (await res.json()) as Array<{
    version: string
    lts: string | false
    date: string
    files: string[]
  }>

  // Solo versiones con binario Win x64 disponible — TODAS
  return all
    .filter((v) => v.files.includes('win-x64-exe'))
    .map(({ version, lts, date }) => ({ version, lts, date }))
}

/* ── Versiones instaladas localmente ───────────────────── */

export async function listInstalledVersions(): Promise<InstalledRuntime[]> {
  const result: InstalledRuntime[] = [
    {
      version: 'embedded',
      label: `Embedded (${process.versions.node})`,
      path: process.execPath,
    },
  ]

  const dir = runtimesDir()
  await mkdir(dir, { recursive: true })

  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const binPath = join(dir, entry.name, 'node.exe')
    try {
      await stat(binPath)
      result.push({
        version: entry.name,
        label: `Node.js ${entry.name}`,
        path: binPath,
      })
    } catch {
      // Directorio sin binario válido, ignorar
    }
  }

  return result
}

/* ── Instalar una versión ──────────────────────────────── */

export async function installVersion(
  version: string,
  window: BrowserWindow,
): Promise<void> {
  assertValidVersion(version)
  const versionDir = join(runtimesDir(), version)
  await mkdir(versionDir, { recursive: true })

  const binPath = join(versionDir, 'node.exe')
  const url = `https://nodejs.org/dist/${version}/win-x64/node.exe`

  const res = await net.fetch(url)
  if (!res.ok) throw new Error(`Descarga falló: ${res.status} de ${url}`)

  const totalBytes = Number(res.headers.get('content-length') ?? 0)
  let downloaded = 0

  const fileStream = createWriteStream(binPath)

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Sin body en la respuesta')

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      fileStream.write(Buffer.from(value))
      downloaded += value.byteLength

      if (totalBytes > 0) {
        const pct = Math.round((downloaded / totalBytes) * 100)
        window.webContents.send(IPC_CHANNELS.RUNTIME_INSTALL_PROGRESS, pct)
      }
    }
  } finally {
    fileStream.end()
    reader.releaseLock()
  }

  // Esperar a que el stream cierre
  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', resolve)
    fileStream.on('error', reject)
  })
}

/* ── Desinstalar una versión ───────────────────────────── */

export async function uninstallVersion(version: string): Promise<void> {
  if (version === 'embedded') return // No se puede eliminar el embebido
  assertValidVersion(version)
  const versionDir = join(runtimesDir(), version)
  await rm(versionDir, { recursive: true })

  // Si era la versión activa, revertir a embedded
  const active = await getActiveVersion()
  if (active === version) {
    await setActiveVersion('embedded')
  }
}

/* ── Versión activa ────────────────────────────────────── */

export async function getActiveVersion(): Promise<string> {
  try {
    const data = await readFile(activeFile(), 'utf-8')
    const parsed = JSON.parse(data) as { active: string }
    return parsed.active ?? 'embedded'
  } catch {
    return 'embedded'
  }
}

export async function setActiveVersion(version: string): Promise<void> {
  if (version !== 'embedded') assertValidVersion(version)
  const dir = join(app.getPath('userData'), 'runtimes')
  await mkdir(dir, { recursive: true })
  await writeFile(activeFile(), JSON.stringify({ active: version }), 'utf-8')
}

/* ── Resolver ruta del binario para ejecución ──────────── */

export async function resolveNodeBinary(): Promise<{ bin: string; env: Record<string, string> }> {
  const active = await getActiveVersion()
  if (active === 'embedded') {
    return {
      bin: process.execPath,
      env: { ELECTRON_RUN_AS_NODE: '1' },
    }
  }

  const binPath = join(runtimesDir(), active, 'node.exe')
  try {
    await stat(binPath)
    return { bin: binPath, env: {} }
  } catch {
    // Binario no encontrado, fallback a embedded
    return {
      bin: process.execPath,
      env: { ELECTRON_RUN_AS_NODE: '1' },
    }
  }
}
