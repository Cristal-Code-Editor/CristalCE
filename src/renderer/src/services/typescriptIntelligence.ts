/**
 * Servicio de inteligencia TypeScript para CristalCE.
 * Configura el worker TS de Monaco con:
 *   1. compilerOptions del tsconfig.json del proyecto
 *   2. Type definitions de node_modules (@types/*, inline .d.ts)
 *   3. Archivos fuente del proyecto para cross-file awareness
 *
 * Todas las URIs son absolutas (file:///C:/...) para que el module resolver
 * de Monaco coincida con las URIs de los modelos creados por CodeEditor.
 *
 * Se invoca cuando se abre un workspace y se limpia al cerrar/cambiar.
 */
import * as monaco from 'monaco-editor'

// Monaco 0.55+ expone TS en `monaco.typescript` en vez de `monaco.languages.typescript`
const ts = (monaco as any).typescript as typeof import('monaco-editor').typescript

/** Disposables activos para limpiar al cambiar de workspace */
let activeDisposables: monaco.IDisposable[] = []

/**
 * Mapa de extraLibs de archivos fuente del proyecto.
 * Permite actualizar/eliminar extraLibs individuales cuando el filesystem cambia,
 * manteniendo la visibilidad cross-file actualizada sin recargar todo el workspace.
 */
const sourceExtraLibs = new Map<string, { ts: monaco.IDisposable; js: monaco.IDisposable }>()

/** Extensiones que participan en la resolución de módulos TS/JS */
const TS_JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

/** Cleanup del file watcher subscription */
let fsWatchCleanup: (() => void) | null = null

/**
 * Mapea compilerOptions del tsconfig.json a valores que Monaco acepta.
 * Monaco usa enums numéricos para target, module, jsx, etc.
 */
function mapCompilerOptions(
  raw: Record<string, unknown>,
): import('monaco-editor').typescript.CompilerOptions {
  const targetMap: Record<string, number> = {
    es3: ts.ScriptTarget.ES3,
    es5: ts.ScriptTarget.ES5,
    es2015: ts.ScriptTarget.ES2015,
    es2016: ts.ScriptTarget.ES2016,
    es2017: ts.ScriptTarget.ES2017,
    es2018: ts.ScriptTarget.ES2018,
    es2019: ts.ScriptTarget.ES2019,
    es2020: ts.ScriptTarget.ES2020,
    esnext: ts.ScriptTarget.ESNext,
  }

  const moduleMap: Record<string, number> = {
    none: ts.ModuleKind.None,
    commonjs: ts.ModuleKind.CommonJS,
    amd: ts.ModuleKind.AMD,
    umd: ts.ModuleKind.UMD,
    system: ts.ModuleKind.System,
    es2015: ts.ModuleKind.ES2015,
    esnext: ts.ModuleKind.ESNext,
  }

  const jsxMap: Record<string, number> = {
    none: ts.JsxEmit.None,
    preserve: ts.JsxEmit.Preserve,
    react: ts.JsxEmit.React,
    'react-jsx': ts.JsxEmit.ReactJSX,
    'react-jsxdev': ts.JsxEmit.ReactJSXDev,
    'react-native': ts.JsxEmit.ReactNative,
  }

  const moduleResolutionMap: Record<string, number> = {
    classic: ts.ModuleResolutionKind.Classic,
    node: ts.ModuleResolutionKind.NodeJs,
    node16: ts.ModuleResolutionKind.NodeJs,
    nodenext: ts.ModuleResolutionKind.NodeJs,
    bundler: ts.ModuleResolutionKind.NodeJs,
  }

  const target = typeof raw.target === 'string'
    ? targetMap[raw.target.toLowerCase()] ?? ts.ScriptTarget.ESNext
    : ts.ScriptTarget.ESNext

  const module = typeof raw.module === 'string'
    ? moduleMap[raw.module.toLowerCase()] ?? ts.ModuleKind.ESNext
    : ts.ModuleKind.ESNext

  const jsx = typeof raw.jsx === 'string'
    ? jsxMap[raw.jsx.toLowerCase()] ?? ts.JsxEmit.ReactJSX
    : ts.JsxEmit.ReactJSX

  const moduleResolution = typeof raw.moduleResolution === 'string'
    ? moduleResolutionMap[raw.moduleResolution.toLowerCase()] ?? ts.ModuleResolutionKind.NodeJs
    : ts.ModuleResolutionKind.NodeJs

  return {
    target,
    module,
    jsx,
    moduleResolution,
    allowJs: raw.allowJs === true,
    checkJs: raw.checkJs === true,
    strict: raw.strict !== false,
    esModuleInterop: raw.esModuleInterop !== false,
    allowSyntheticDefaultImports: raw.allowSyntheticDefaultImports !== false,
    forceConsistentCasingInFileNames: raw.forceConsistentCasingInFileNames !== false,
    resolveJsonModule: raw.resolveJsonModule === true,
    isolatedModules: raw.isolatedModules === true,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: typeof raw.baseUrl === 'string' ? raw.baseUrl : './',
    allowNonTsExtensions: true,
  }
}

/**
 * Convierte una ruta absoluta del SO a URI file:/// normalizada.
 * Ej: C:\Users\project\src\index.ts → file:///C:/Users/project/src/index.ts
 */
function toFileUri(absolutePath: string): string {
  return `file:///${absolutePath.replace(/\\/g, '/')}`
}

/**
 * Registra o reemplaza el extraLib de un archivo fuente del proyecto.
 * Si el archivo ya tenía un extraLib previo, lo dispone antes de crear uno nuevo.
 */
function upsertSourceExtraLib(fileUri: string, content: string): void {
  const tsDefaults = ts.typescriptDefaults
  const jsDefaults = ts.javascriptDefaults

  // Disponer extraLib previo si existía
  const existing = sourceExtraLibs.get(fileUri)
  if (existing) {
    existing.ts.dispose()
    existing.js.dispose()
  }

  const d1 = tsDefaults.addExtraLib(content, fileUri)
  const d2 = jsDefaults.addExtraLib(content, fileUri)
  sourceExtraLibs.set(fileUri, { ts: d1, js: d2 })
}

/**
 * Elimina el extraLib de un archivo fuente que ya no existe en disco.
 */
function removeSourceExtraLib(fileUri: string): void {
  const existing = sourceExtraLibs.get(fileUri)
  if (existing) {
    existing.ts.dispose()
    existing.js.dispose()
    sourceExtraLibs.delete(fileUri)
  }
}

/**
 * Maneja eventos del file watcher para mantener los extraLibs sincronizados.
 * - 'change': el contenido de un archivo cambió → re-leer y actualizar extraLib
 * - 'rename': archivo creado/eliminado/renombrado → agregar o quitar extraLib
 */
async function handleFsWatchEvent(event: { eventType: 'rename' | 'change'; filePath: string }): Promise<void> {
  const ext = event.filePath.substring(event.filePath.lastIndexOf('.'))
  if (!TS_JS_EXTENSIONS.has(ext)) return

  // Ignorar archivos dentro de node_modules (los tipos se cargan una vez)
  if (event.filePath.includes('node_modules')) return

  const fileUri = toFileUri(event.filePath)

  if (event.eventType === 'change') {
    // Contenido modificado → re-leer del disco y actualizar extraLib
    try {
      const content = await window.cristalAPI.readFile(event.filePath)
      upsertSourceExtraLib(fileUri, content)
    } catch {
      // Archivo no legible (quizá se eliminó justo después del evento)
    }
  } else if (event.eventType === 'rename') {
    // rename puede ser crear o eliminar; intentar leer para determinar cuál
    try {
      const content = await window.cristalAPI.readFile(event.filePath)
      upsertSourceExtraLib(fileUri, content)
    } catch {
      // El archivo no existe → fue eliminado, quitar extraLib
      removeSourceExtraLib(fileUri)
    }
  }
}

/**
 * Configura la inteligencia TypeScript de Monaco para un workspace.
 * Llamar cada vez que se abra o cambie de workspace.
 */
export async function configureTypeScriptForWorkspace(rootPath: string): Promise<void> {
  // Limpiar configuración anterior
  disposeTypeScript()

  const tsDefaults = ts.typescriptDefaults
  const jsDefaults = ts.javascriptDefaults

  // 1. Obtener tsconfig.json del proyecto
  let config: { compilerOptions: Record<string, unknown>; fileNames: string[] }
  try {
    config = await window.cristalAPI.tsGetConfig(rootPath)
  } catch (err) {
    console.error('[TS Intelligence] Error al obtener tsconfig:', err)
    config = { compilerOptions: {}, fileNames: [] }
  }

  const compilerOptions = mapCompilerOptions(config.compilerOptions)

  // Aplicar compilerOptions a ambos workers (TS y JS)
  tsDefaults.setCompilerOptions(compilerOptions)
  jsDefaults.setCompilerOptions(compilerOptions)

  // Configurar diagnósticos
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  })
  jsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  })

  // Eager model sync para que el worker conozca todos los modelos abiertos
  tsDefaults.setEagerModelSync(true)
  jsDefaults.setEagerModelSync(true)

  // 2. Cargar type definitions de node_modules (estáticas, no cambian en runtime)
  try {
    const typeLibs = await window.cristalAPI.tsGetTypeLibs(rootPath)
    console.info(`[TS Intelligence] ${typeLibs.length} type definitions cargadas`)
    for (const lib of typeLibs) {
      const d1 = tsDefaults.addExtraLib(lib.content, lib.filePath)
      const d2 = jsDefaults.addExtraLib(lib.content, lib.filePath)
      activeDisposables.push(d1, d2)
    }
  } catch (err) {
    console.error('[TS Intelligence] Error al cargar type definitions:', err)
  }

  // 3. Cargar fuentes del proyecto para visibilidad entre archivos
  //    Usa sourceExtraLibs (con tracking) para poder actualizar individualmente
  try {
    const fileNames = config.fileNames ?? []
    const sources = await window.cristalAPI.tsGetProjectSources(rootPath, fileNames)
    console.info(`[TS Intelligence] ${sources.length} archivos fuente cargados`)
    for (const src of sources) {
      upsertSourceExtraLib(src.filePath, src.content)
    }
  } catch (err) {
    console.error('[TS Intelligence] Error al cargar fuentes del proyecto:', err)
  }

  // 4. Suscribirse al file watcher para mantener extraLibs sincronizados
  //    Cuando un archivo TS/JS cambia en disco, se actualiza su extraLib
  fsWatchCleanup = window.cristalAPI.onFsWatchEvent(handleFsWatchEvent)
}

/**
 * Limpia la configuración TS activa (al cerrar workspace o cambiar).
 */
export function disposeTypeScript(): void {
  // Limpiar suscripción al file watcher
  if (fsWatchCleanup) {
    fsWatchCleanup()
    fsWatchCleanup = null
  }

  // Disponer extraLibs de node_modules
  for (const d of activeDisposables) {
    d.dispose()
  }
  activeDisposables = []

  // Disponer extraLibs de archivos fuente del proyecto
  for (const [, entry] of sourceExtraLibs) {
    entry.ts.dispose()
    entry.js.dispose()
  }
  sourceExtraLibs.clear()
}
