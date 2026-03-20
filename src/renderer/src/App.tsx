import { useEffect } from 'react'
import MainLayout from './components/layout/MainLayout'
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext'

/**
 * Componente raíz de CristalCE.
 * Renderiza el layout principal dentro del WorkspaceProvider.
 */
function App(): JSX.Element {
  return (
    <WorkspaceProvider>
      <AppInner />
    </WorkspaceProvider>
  )
}

/**
 * Componente interno que suscribe eventos IPC globales
 * y los despacha al WorkspaceContext.
 */
function AppInner(): JSX.Element {
  const { openFolder } = useWorkspace()

  useEffect(() => {
    const unsubFolder = window.cristalAPI.onFolderOpen((folderPath) => {
      openFolder(folderPath)
    })

    return () => {
      unsubFolder()
    }
  }, [openFolder])

  return <MainLayout />
}

export default App
