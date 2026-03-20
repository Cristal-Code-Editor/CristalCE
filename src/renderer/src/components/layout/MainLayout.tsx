import { Group, Panel, Separator } from 'react-resizable-panels'
import Header from './Header'
import ActivityBar from './ActivityBar'
import Sidebar from './Sidebar'
import EditorArea from './EditorArea'
import StatusBar from './StatusBar'

/**
 * Layout principal de CristalCE — identidad visual premium propia.
 * Estructura: Header → [ActivityBar | Sidebar (resize) | Editor] → StatusBar.
 * Paneles redimensionables con persistencia en localStorage.
 */
export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Header — cabecera personalizada con menú simulado y logo */}
      <Header />

      {/* Zona principal: ActivityBar + Paneles redimensionables */}
      <div className="flex flex-1 overflow-hidden">
        {/* ActivityBar — ancho fijo 48px, fuera del sistema de paneles */}
        <ActivityBar />

        {/* Separador vertical sutil entre ActivityBar y Sidebar */}
        <div className="w-px shrink-0" style={{ backgroundColor: 'var(--cristal-border-subtle)' }} />

        {/* Group horizontal: Sidebar redimensionable + Editor */}
        <Group direction="horizontal" autoSaveId="cristal-main-layout">
          <Panel
            defaultSize={20}
            minSize={10}
            maxSize={40}
            order={1}
          >
            <Sidebar />
          </Panel>

          {/* Separator — línea fina con hover cian cristalino */}
          <Separator
            className="group relative w-px transition-colors duration-150"
            style={{ backgroundColor: 'var(--cristal-border)' }}
          >
            <div className="absolute inset-y-0 -left-[2px] w-[5px] cursor-col-resize group-hover:bg-[var(--cristal-accent)] group-data-[resize-handle-active]:bg-[var(--cristal-accent)]" />
          </Separator>

          <Panel order={2}>
            <EditorArea />
          </Panel>
        </Group>
      </div>

      {/* StatusBar — barra inferior charcoal */}
      <StatusBar />
    </div>
  )
}
