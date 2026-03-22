/**
 * Servicio de inteligencia TypeScript para CristalCE.
 * Configura el worker TS de Monaco con:
 *   1. compilerOptions del tsconfig.json del proyecto
 *   2. Type definitions de node_modules (@types/*, inline .d.ts)
 *   3. Archivos fuente del proyecto para cross-file awareness
 *
 * Se invoca cuando se abre un workspace y se limpia al cerrar/cambiar.
 */
import * as monaco from 'monaco-editor'

// Monaco 0.55+ expone TS en `monaco.typescript` en vez de `monaco.languages.typescript`
const ts = (monaco as any).typescript as typeof import('monaco-editor').typescript

/** Disposables activos para limpiar al cambiar de workspace */
let activeDisposables: monaco.IDisposable[] = []

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
 * Configura la inteligencia TypeScript de Monaco para un workspace.
 * Llamar cada vez que se abra o cambie de workspace.
 */
export async function configureTypeScriptForWorkspace(rootPath: string): Promise<void> {
  // Limpiar configuración anterior
  disposeTypeScript()

  const tsDefaults = ts.typescriptDefaults
  const jsDefaults = ts.javascriptDefaults

  // 1. Obtener tsconfig.json del proyecto
  const config = await window.cristalAPI.tsGetConfig(rootPath)
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

  // Eager model sync para que el worker conozca todos los modelos
  tsDefaults.setEagerModelSync(true)
  jsDefaults.setEagerModelSync(true)

  // 2. Cargar type definitions de node_modules
  const typeLibs = await window.cristalAPI.tsGetTypeLibs(rootPath)
  for (const lib of typeLibs) {
    const d1 = tsDefaults.addExtraLib(lib.content, lib.filePath)
    const d2 = jsDefaults.addExtraLib(lib.content, lib.filePath)
    activeDisposables.push(d1, d2)
  }

  // 3. Cargar fuentes del proyecto para cross-file awareness
  const sources = await window.cristalAPI.tsGetProjectSources(rootPath, config.fileNames)
  for (const src of sources) {
    const d1 = tsDefaults.addExtraLib(src.content, src.filePath)
    const d2 = jsDefaults.addExtraLib(src.content, src.filePath)
    activeDisposables.push(d1, d2)
  }

  console.log(
    `[TypeScript Intelligence] Configurado: ${typeLibs.length} type libs, ${sources.length} project sources`,
  )
}

/**
 * Limpia la configuración TS activa (al cerrar workspace o cambiar).
 */
export function disposeTypeScript(): void {
  for (const d of activeDisposables) {
    d.dispose()
  }
  activeDisposables = []
}
