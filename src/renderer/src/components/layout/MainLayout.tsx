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
        <Group direction="horizontal" autoSaveId="cristal-layout-v2">
          <Panel
            defaultSize={22}
            minSize={14}
            maxSize={45}
            order={1}
          >
            <Sidebar />
          </Panel>

          {/* Separator — franja visible y arrastrable con hover cian */}
          <Separator
            style={{
              width: 4,
              cursor: 'col-resize',
              backgroundColor: 'var(--cristal-border)',
              transition: 'background-color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--cristal-accent)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--cristal-border)'
            }}
          />

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
