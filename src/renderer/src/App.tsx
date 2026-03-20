import { useEffect, useState } from 'react'

/**
 * Componente raíz de CristalCE.
 * Escucha los eventos IPC del menú nativo y muestra la última acción recibida.
 * Sirve como punto de partida para validar el flujo Main → Preload → Renderer.
 */
function App(): JSX.Element {
  const [lastAction, setLastAction] = useState<string>('Ninguna acción aún')
  const [openedFile, setOpenedFile] = useState<string | null>(null)
  const [openedFolder, setOpenedFolder] = useState<string | null>(null)

  useEffect(() => {
    // Suscripción a acciones del menú nativo vía cristalAPI (preload bridge)
    const unsubAction = window.cristalAPI.onMenuAction((action) => {
      setLastAction(action)
    })

    const unsubFile = window.cristalAPI.onFileOpen((filePath) => {
      setOpenedFile(filePath)
      setLastAction(`FILE_OPEN: ${filePath}`)
    })

    const unsubFolder = window.cristalAPI.onFolderOpen((folderPath) => {
      setOpenedFolder(folderPath)
      setLastAction(`FILE_OPEN_FOLDER: ${folderPath}`)
    })

    // Limpieza de listeners al desmontar
    return () => {
      unsubAction()
      unsubFile()
      unsubFolder()
    }
  }, [])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold text-white">CristalCE</h1>
      <p className="text-[var(--cristal-text-secondary)]">
        Última acción del menú:{' '}
        <span className="font-mono text-[var(--cristal-accent)]">{lastAction}</span>
      </p>
      {openedFile && (
        <p className="text-sm text-[var(--cristal-text-secondary)]">
          Archivo: <code className="text-[var(--cristal-text-primary)]">{openedFile}</code>
        </p>
      )}
      {openedFolder && (
        <p className="text-sm text-[var(--cristal-text-secondary)]">
          Carpeta: <code className="text-[var(--cristal-text-primary)]">{openedFolder}</code>
        </p>
      )}
    </div>
  )
}

export default App
