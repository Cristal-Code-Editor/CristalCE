/**
 * Servicio de configuración TypeScript para CristalCE.
 * Lee tsconfig.json del proyecto y escanea node_modules para type definitions.
 *
 * Usado por el Renderer para configurar Monaco TS worker con:
 *   - compilerOptions del proyecto
 *   - Declaraciones de tipo de dependencias (@types/*)
 *   - Archivos fuente del proyecto para cross-file awareness
 */
import { join, relative } from 'path'
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

/* ── tsconfig.json ──────────────────────────────────────── */

export async function readTsConfig(rootPath: string): Promise<TsProjectConfig> {
  const tsconfigPath = join(rootPath, 'tsconfig.json')

  let compilerOptions: Record<string, unknown> = {}

  if (existsSync(tsconfigPath)) {
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

export async function scanTypeLibs(rootPath: string): Promise<TypeLib[]> {
  const libs: TypeLib[] = []
  const nodeModules = join(rootPath, 'node_modules')

  if (!existsSync(nodeModules)) return libs

  // 1. @types/* packages
  const atTypesDir = join(nodeModules, '@types')
  if (existsSync(atTypesDir)) {
    try {
      const packages = await readdir(atTypesDir)
      for (const pkg of packages) {
        const indexPath = join(atTypesDir, pkg, 'index.d.ts')
        if (existsSync(indexPath)) {
          try {
            const content = await readFile(indexPath, 'utf-8')
            // Usar URI relativa al workspace para Monaco
            const filePath = `file:///node_modules/@types/${pkg}/index.d.ts`
            libs.push({ filePath, content })
          } catch {
            // Archivo no legible, omitir
          }
        }
      }
    } catch {
      // Directorio @types no legible
    }
  }

  // 2. Paquetes con .d.ts inline (package.json → "types" o "typings")
  try {
    const topLevel = await readdir(nodeModules)
    for (const pkg of topLevel) {
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

    const typesPath = join(pkgDir, typesField)
    if (!existsSync(typesPath)) return

    const content = await readFile(typesPath, 'utf-8')
    const filePath = `file:///node_modules/${pkgName}/${typesField}`
    libs.push({ filePath, content })
  } catch {
    // Omitir
  }
}

/* ── Leer archivos fuente del proyecto para visibilidad entre archivos ── */

export async function readProjectSources(
  rootPath: string,
  fileNames: string[],
): Promise<TypeLib[]> {
  const sources: TypeLib[] = []

  for (const fullPath of fileNames) {
    try {
      const content = await readFile(fullPath, 'utf-8')
      // Convertir ruta absoluta a URI relativa al workspace
      const rel = relative(rootPath, fullPath).replace(/\\/g, '/')
      const filePath = `file:///${rel}`
      sources.push({ filePath, content })
    } catch {
      // Omitir archivos no legibles
    }
  }

  return sources
}
