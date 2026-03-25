/**
 * Administrador de persistencia para CristalCE.
 * Almacena configuración global en userData y estado de workspace por proyecto.
 *
 * Ubicaciones:
 *   - Global:    {userData}/cristalce-settings.json
 *   - Workspace: {projectRoot}/.cristalce/state.json
 */
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

/* ── Tipos ──────────────────────────────────────────────── */

export interface GlobalSettings {
  fontSize: number
  tabSize: number
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
  minimap: boolean
  recentWorkspaces: string[]
}

export interface WorkspaceState {
  openTabs: { filePath: string; isActive: boolean }[]
  sidebarWidth?: number
  terminalOpen?: boolean
}

/* ── Valores por defecto ────────────────────────────────── */

const DEFAULT_GLOBAL: GlobalSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'off',
  minimap: true,
  recentWorkspaces: [],
}

const DEFAULT_WORKSPACE: WorkspaceState = {
  openTabs: [],
}

/**
 * Conjunto de claves permitidas para GlobalSettings.
 * Se usa para filtrar el patch recibido vía IPC y prevenir settings injection:
 * un renderer comprometido podría inyectar claves arbitrarias en el JSON
 * de configuración si no se validan contra este listado.
 */
const ALLOWED_SETTINGS_KEYS = new Set<keyof GlobalSettings>([
  'fontSize',
  'tabSize',
  'wordWrap',
  'minimap',
  'recentWorkspaces',
])

/* ── Rutas ──────────────────────────────────────────────── */

function globalSettingsPath(): string {
  return join(app.getPath('userData'), 'cristalce-settings.json')
}

function workspaceDir(rootPath: string): string {
  return join(rootPath, '.cristalce')
}

function workspaceStatePath(rootPath: string): string {
  return join(workspaceDir(rootPath), 'state.json')
}

/* ── Lectura / Escritura segura de JSON ─────────────────── */

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    if (!existsSync(filePath)) return fallback
    const raw = await readFile(filePath, 'utf-8')
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  const dir = join(filePath, '..')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/* ── API pública ────────────────────────────────────────── */

export async function getGlobalSettings(): Promise<GlobalSettings> {
  return readJson(globalSettingsPath(), DEFAULT_GLOBAL)
}

export async function setGlobalSettings(patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
  const current = await getGlobalSettings()
  // Filtrar el patch a las claves permitidas para prevenir settings injection
  const safePatch: Partial<GlobalSettings> = {}
  for (const key of ALLOWED_SETTINGS_KEYS) {
    if (key in patch) safePatch[key] = patch[key] as GlobalSettings[typeof key]
  }
  const merged = { ...current, ...safePatch }
  await writeJson(globalSettingsPath(), merged)
  return merged
}

export async function addRecentWorkspace(rootPath: string): Promise<void> {
  const settings = await getGlobalSettings()
  const filtered = settings.recentWorkspaces.filter((p) => p !== rootPath)
  filtered.unshift(rootPath)
  // Mantener máximo 10 recientes
  settings.recentWorkspaces = filtered.slice(0, 10)
  await writeJson(globalSettingsPath(), settings)
}

export async function getWorkspaceState(rootPath: string): Promise<WorkspaceState> {
  return readJson(workspaceStatePath(rootPath), DEFAULT_WORKSPACE)
}

export async function setWorkspaceState(
  rootPath: string,
  state: WorkspaceState,
): Promise<void> {
  await writeJson(workspaceStatePath(rootPath), state)
}
