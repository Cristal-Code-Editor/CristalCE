import { Group, Panel, Separator } from 'react-resizable-panels'
import ActivityBar from './ActivityBar'
import Sidebar from './Sidebar'
import EditorArea from './EditorArea'
import StatusBar from './StatusBar'

/**
 * Layout principal de CristalCE.
 * Ensambla los 4 componentes estructurales usando react-resizable-panels:
 *   [ActivityBar (fijo)] | [Sidebar (redimensionable)] | [EditorArea (flex)]
 *                        [StatusBar (fijo inferior)]
 *
 * La estructura replica el diseño de VS Code con paneles arrastables.
 */
export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Zona principal: ActivityBar + Paneles redimensionables */}
      <div className="flex flex-1 overflow-hidden">
        {/* ActivityBar — ancho fijo 48px, fuera del sistema de paneles */}
        <ActivityBar />

        {/* Group horizontal: Sidebar redimensionable + Editor ocupa el resto */}
        <Group direction="horizontal" autoSaveId="cristal-main-layout">
          {/* Sidebar — ancho por defecto ~20%, mínimo ~10% (≈150px en 1280px) */}
          <Panel
            defaultSize={20}
            minSize={10}
            maxSize={40}
            order={1}
          >
            <Sidebar />
          </Panel>

          {/* Separator de redimensionamiento — línea fina con hover visual */}
          <Separator
            className="group relative w-[1px] transition-colors duration-150"
            style={{ backgroundColor: 'var(--cristal-border)' }}
          >
            {/* Zona de agarre expandida para facilitar el drag (4px invisibles) */}
            <div className="absolute inset-y-0 -left-[2px] w-[5px] cursor-col-resize group-hover:bg-[var(--cristal-accent)] group-data-[resize-handle-active]:bg-[var(--cristal-accent)]" />
          </Separator>

          {/* Editor — ocupa todo el espacio restante */}
          <Panel order={2}>
            <EditorArea />
          </Panel>
        </Group>
      </div>

      {/* StatusBar — pegada al fondo, ancho completo */}
      <StatusBar />
    </div>
  )
}
