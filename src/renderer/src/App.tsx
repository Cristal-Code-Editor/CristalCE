import { useEffect } from 'react'
import MainLayout from './components/layout/MainLayout'

/**
 * Componente raíz de CristalCE.
 * Renderiza el layout principal y mantiene la suscripción a eventos IPC
 * del menú nativo para futuras acciones (abrir archivo, guardar, etc.).
 */
function App(): JSX.Element {
  useEffect(() => {
    // Suscripción a acciones del menú nativo vía cristalAPI (preload bridge)
    const unsubAction = window.cristalAPI.onMenuAction((action) => {
      // TODO: Despachar a un store/contexto global cuando se implemente
      console.debug('[IPC] Menu action:', action)
    })

    const unsubFile = window.cristalAPI.onFileOpen((filePath) => {
      console.debug('[IPC] File open:', filePath)
    })

    const unsubFolder = window.cristalAPI.onFolderOpen((folderPath) => {
      console.debug('[IPC] Folder open:', folderPath)
    })

    // Limpieza de listeners al desmontar
    return () => {
      unsubAction()
      unsubFile()
      unsubFolder()
    }
  }, [])

  return <MainLayout />
}

export default App
