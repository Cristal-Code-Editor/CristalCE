/**
 * Mapeo de extensiones de archivo → Monaco language ID.
 * Cubre los lenguajes más comunes; Monaco provee soporte incorporado para todos estos.
 */
const EXT_TO_LANGUAGE: Record<string, string> = {
  // TypeScript / JavaScript
  ts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  jsx: 'javascriptreact',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',

  // Data
  json: 'json',
  jsonc: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',

  // Markdown / Text
  md: 'markdown',
  mdx: 'markdown',
  txt: 'plaintext',

  // Backend / Systems
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  lua: 'lua',
  r: 'r',
  sql: 'sql',

  // Shell / Config
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  dockerfile: 'dockerfile',

  // Config files
  ini: 'ini',
  conf: 'ini',
  env: 'ini',
  gitignore: 'ini',

  // GraphQL / Protobuf
  graphql: 'graphql',
  gql: 'graphql',
  proto: 'protobuf',
}

/**
 * Detecta el Monaco language ID a partir del nombre de archivo.
 * Maneja archivos especiales (Dockerfile, Makefile) y extensiones compuestas.
 */
export function detectLanguage(fileName: string): string {
  const lower = fileName.toLowerCase()

  // Archivos especiales sin extensión
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'dockerfile'
  if (lower === 'makefile') return 'makefile'
  if (lower === '.gitignore' || lower === '.gitattributes') return 'ini'
  if (lower === '.editorconfig') return 'ini'
  if (lower === '.prettierrc') return 'json'
  if (lower === '.eslintrc') return 'json'
  if (lower === 'tsconfig.json' || lower === 'jsconfig.json') return 'json'

  const ext = lower.split('.').pop() ?? ''
  return EXT_TO_LANGUAGE[ext] ?? 'plaintext'
}

/**
 * Extrae el nombre de archivo de una ruta completa.
 * Maneja separadores / y \ (Windows).
 */
export function fileNameFromPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
}
