/**
 * Servicio de configuración TypeScript para CristalCE.
 * Lee tsconfig.json del proyecto y escanea node_modules para type definitions.
 *
 * Usado por el Renderer para configurar Monaco TS worker con:
 *   - compilerOptions del proyecto
 *   - Declaraciones de tipo de dependencias (@types/*)
 *   - Archivos fuente del proyecto para cross-file awareness
 */
import { join } from 'path'
import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'

/* ── Tipos ──────────────────────────────────────────────── */

export interface TsProjectConfig {
  compilerOptions: Record<string, unknown>
  fileNames: string[]
}

export interface TypeLib {
  /** URI del archivo (file:///path/to/file.d.ts) */
  filePath: string
  /** Contenido del .d.ts */
  content: string
}

/* ── Búsqueda de directorios de proyecto ────────────────── */

/**
 * Busca el primer tsconfig.json en el workspace.
 * Primero revisa la raíz; si no existe, busca en subdirectorios (BFS, max 3 niveles).
 * Retorna la ruta absoluta del tsconfig.json o null si no se encuentra.
 */
async function findTsConfigPath(rootPath: string): Promise<string | null> {
  const rootTsconfig = join(rootPath, 'tsconfig.json')
  if (existsSync(rootTsconfig)) return rootTsconfig

  // BFS por subdirectorios hasta 3 niveles de profundidad
  const queue: { dir: string; depth: number }[] = [{ dir: rootPath, depth: 0 }]
  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!
    if (depth >= 3) continue

    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      continue
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry) || entry === 'node_modules') continue
      const fullPath = join(dir, entry)
      let info
      try {
        info = await stat(fullPath)
      } catch {
        continue
      }
      if (!info.isDirectory()) continue

      const tsconfig = join(fullPath, 'tsconfig.json')
      if (existsSync(tsconfig)) return tsconfig
      queue.push({ dir: fullPath, depth: depth + 1 })
    }
  }
  return null
}

/**
 * Busca todos los directorios node_modules en el workspace.
 * Primero revisa la raíz; si no existe, busca en subdirectorios (BFS, max 3 niveles).
 */
async function findNodeModulesDirs(rootPath: string): Promise<string[]> {
  const rootNm = join(rootPath, 'node_modules')
  if (existsSync(rootNm)) return [rootNm]

  const results: string[] = []
  const queue: { dir: string; depth: number }[] = [{ dir: rootPath, depth: 0 }]
  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!
    if (depth >= 3) continue

    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry)

      // Detectar node_modules ANTES del filtro de IGNORED_DIRS
      if (entry === 'node_modules') {
        results.push(fullPath)
        continue
      }

      if (IGNORED_DIRS.has(entry)) continue

      let info
      try {
        info = await stat(fullPath)
      } catch {
        continue
      }
      if (info.isDirectory()) {
        queue.push({ dir: fullPath, depth: depth + 1 })
      }
    }
  }
  return results
}

/* ── tsconfig.json ──────────────────────────────────────── */

export async function readTsConfig(rootPath: string): Promise<TsProjectConfig> {
  let compilerOptions: Record<string, unknown> = {}

  const tsconfigPath = await findTsConfigPath(rootPath)

  if (tsconfigPath) {
    try {
      const raw = await readFile(tsconfigPath, 'utf-8')
      // Eliminar comentarios estilo JSON (tsconfig permite //comments)
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      const parsed = JSON.parse(cleaned)
      compilerOptions = parsed.compilerOptions ?? {}
    } catch {
      // tsconfig malformado → usar defaults
    }
  }

  // Escanear archivos TS/TSX del proyecto (ignorando node_modules, dist, .git)
  const fileNames = await scanProjectFiles(rootPath)

  return { compilerOptions, fileNames }
}

/* ── Escaneo de archivos TS del proyecto ────────────────── */

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', '.cristalce'])
const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

async function scanProjectFiles(rootPath: string, maxFiles = 500): Promise<string[]> {
  const files: string[] = []

  async function walk(dir: string): Promise<void> {
    if (files.length >= maxFiles) return

    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break

      if (IGNORED_DIRS.has(entry)) continue

      const fullPath = join(dir, entry)

      let info
      try {
        info = await stat(fullPath)
      } catch {
        continue
      }

      if (info.isDirectory()) {
        await walk(fullPath)
      } else {
        const ext = entry.substring(entry.lastIndexOf('.'))
        if (TS_EXTENSIONS.has(ext)) {
          files.push(fullPath)
        }
      }
    }
  }

  await walk(rootPath)
  return files
}

/* ── Escaneo de type definitions en node_modules ────────── */

/**
 * Límites para prevenir carga excesiva de archivos de tipos.
 * MAX_DTS_PER_PKG: máximo de .d.ts por paquete (ej. @types/node tiene ~200).
 * MAX_DTS_TOTAL: máximo global de .d.ts cargados.
 * MAX_DTS_SIZE: máximo de bytes por archivo .d.ts (omitir archivos enormes).
 */
const MAX_DTS_PER_PKG = 1500
const MAX_DTS_TOTAL = 8000
const MAX_DTS_SIZE = 1024 * 1024 // 1 MB por archivo

/**
 * Escanea recursivamente todos los .d.ts dentro de un directorio de paquete.
 * Usa URIs absolutas (file:///C:/...) para que el module resolver de Monaco
 * resuelva correctamente las referencias entre archivos.
 */
async function scanDtsFiles(pkgDir: string, libs: TypeLib[]): Promise<void> {
  if (libs.length >= MAX_DTS_TOTAL) return

  let pkgCount = 0
  async function walk(dir: string): Promise<void> {
    if (pkgCount >= MAX_DTS_PER_PKG || libs.length >= MAX_DTS_TOTAL) return

    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return
    }

    // Separar archivos y directorios para procesar .d.ts primero.
    // Paquetes como `next` tienen 1400+ .d.ts internos en dist/ que agotan
    // MAX_DTS_PER_PKG antes de llegar a los .d.ts públicos (image.d.ts, etc.)
    const files: { name: string; fullPath: string; size: number }[] = []
    const dirs: { name: string; fullPath: string }[] = []

    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git') continue
      const fullPath = join(dir, entry)
      let info
      try {
        info = await stat(fullPath)
      } catch {
        continue
      }
      if (info.isDirectory()) {
        dirs.push({ name: entry, fullPath })
      } else if (entry.endsWith('.d.ts') || entry.endsWith('.d.mts') || entry.endsWith('.d.cts')) {
        if (info.size <= MAX_DTS_SIZE) {
          files.push({ name: entry, fullPath, size: info.size })
        }
      }
    }

    // Primero: cargar .d.ts del directorio actual
    for (const file of files) {
      if (pkgCount >= MAX_DTS_PER_PKG || libs.length >= MAX_DTS_TOTAL) break
      try {
        const content = await readFile(file.fullPath, 'utf-8')
        const filePath = `file:///${file.fullPath.replace(/\\/g, '/')}`
        libs.push({ filePath, content })
        pkgCount++
      } catch {
        // Archivo no legible, omitir
      }
    }

    // Después: recurse en subdirectorios
    // Priorizar carpetas de tipos y posponer dist/build para no agotar el límite muy rápido
    dirs.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const isAPrio = aName === 'types' || aName === 'typings'
      const isBPrio = bName === 'types' || bName === 'typings'
      const isADeprio = aName === 'dist' || aName === 'build' || aName === 'out'
      const isBDeprio = bName === 'dist' || bName === 'build' || bName === 'out'
      
      if (isAPrio && !isBPrio) return -1
      if (!isAPrio && isBPrio) return 1
      if (isADeprio && !isBDeprio) return 1
      if (!isADeprio && isBDeprio) return -1
      return a.name.localeCompare(b.name)
    })

    for (const sub of dirs) {
      if (pkgCount >= MAX_DTS_PER_PKG || libs.length >= MAX_DTS_TOTAL) break
      await walk(sub.fullPath)
    }
  }

  await walk(pkgDir)
}

export async function scanTypeLibs(rootPath: string): Promise<TypeLib[]> {
  const libs: TypeLib[] = []

  // Buscar node_modules en la raíz o en subdirectorios del workspace
  const nmDirs = await findNodeModulesDirs(rootPath)
  if (nmDirs.length === 0) return libs

  for (const nodeModules of nmDirs) {
    if (libs.length >= MAX_DTS_TOTAL) break

    // 1. @types/* — cargar TODOS los .d.ts recursivamente (no solo index.d.ts)
    //    Resuelve referencias cruzadas como `/// <reference path="global.d.ts" />`
    const atTypesDir = join(nodeModules, '@types')
    if (existsSync(atTypesDir)) {
      try {
        const packages = await readdir(atTypesDir)
        for (const pkg of packages) {
          if (libs.length >= MAX_DTS_TOTAL) break
          const pkgDir = join(atTypesDir, pkg)
          await scanDtsFiles(pkgDir, libs)
        }
      } catch {
        // Directorio @types no legible
      }
    }

    // 2. Paquetes con .d.ts inline (package.json → "types" o "typings")
    try {
      const topLevel = await readdir(nodeModules)
      for (const pkg of topLevel) {
        if (libs.length >= MAX_DTS_TOTAL) break
        if (pkg.startsWith('.') || pkg === '@types') continue

        // Paquetes con scope (@scope/nombre)
        if (pkg.startsWith('@')) {
          const scopeDir = join(nodeModules, pkg)
          try {
            const scopedPkgs = await readdir(scopeDir)
            for (const scopedPkg of scopedPkgs) {
              await tryLoadPkgTypes(join(scopeDir, scopedPkg), `${pkg}/${scopedPkg}`, libs)
            }
          } catch {
            continue
          }
        } else {
          await tryLoadPkgTypes(join(nodeModules, pkg), pkg, libs)
        }
      }
    } catch {
      // node_modules no legible
    }
  }

  return libs
}

async function tryLoadPkgTypes(pkgDir: string, pkgName: string, libs: TypeLib[]): Promise<void> {
  // Omitir si ya tenemos @types/ para este paquete
  if (libs.some((l) => l.filePath.includes(`@types/${pkgName}/`))) return

  const pkgJsonPath = join(pkgDir, 'package.json')
  if (!existsSync(pkgJsonPath)) return

  try {
    const raw = await readFile(pkgJsonPath, 'utf-8')
    const pkg = JSON.parse(raw)
    const typesField = pkg.types || pkg.typings
    if (!typesField) return

    // Escanear TODOS los .d.ts del paquete recursivamente, no solo el entry point.
    // Paquetes como `next` exponen subpath types (next/image, next/link, etc.)
    // que necesitan sus .d.ts cargados para que Monaco resuelva los imports.
    await scanDtsFiles(pkgDir, libs)
  } catch {
    // Omitir
  }
}

/* ── Leer archivos fuente del proyecto para visibilidad entre archivos ── */

export async function readProjectSources(
  _rootPath: string,
  fileNames: string[],
): Promise<TypeLib[]> {
  const sources: TypeLib[] = []

  for (const fullPath of fileNames) {
    try {
      const content = await readFile(fullPath, 'utf-8')
      // URI absoluta — debe coincidir con las URIs de los modelos que crea CodeEditor
      // para que el module resolver de Monaco resuelva imports entre archivos
      const filePath = `file:///${fullPath.replace(/\\/g, '/')}`
      sources.push({ filePath, content })
    } catch {
      // Omitir archivos no legibles
    }
  }

  return sources
}
