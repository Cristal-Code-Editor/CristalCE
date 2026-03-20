import { Files, Search, Settings } from 'lucide-react'

/**
 * Barra de actividad vertical izquierda (48px fijo).
 * Contiene iconos de navegación principal: Explorador, Búsqueda, Configuración.
 * Replica la barra lateral de VS Code con iconos centrados e indicador de selección.
 */

interface ActivityBarItem {
  icon: React.ElementType
  label: string
  id: string
}

const TOP_ITEMS: ActivityBarItem[] = [
  { icon: Files, label: 'Explorador', id: 'explorer' },
  { icon: Search, label: 'Búsqueda', id: 'search' },
]

const BOTTOM_ITEMS: ActivityBarItem[] = [
  { icon: Settings, label: 'Configuración', id: 'settings' },
]

function ActivityBarIcon({ item, isActive }: { item: ActivityBarItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <button
      title={item.label}
      className={`
        relative flex h-12 w-full items-center justify-center
        transition-colors duration-100
        ${isActive
          ? 'text-white before:absolute before:left-0 before:top-1/2 before:h-6 before:-translate-y-1/2 before:w-[2px] before:bg-white'
          : 'text-[var(--cristal-text-inactive)] hover:text-[var(--cristal-text-primary)]'
        }
      `}
    >
      <Icon size={24} strokeWidth={1.5} />
    </button>
  )
}

export default function ActivityBar() {
  return (
    <div
      className="flex h-full w-12 shrink-0 flex-col justify-between"
      style={{ backgroundColor: 'var(--cristal-bg-activitybar)' }}
    >
      <div className="flex flex-col">
        {TOP_ITEMS.map((item) => (
          <ActivityBarIcon key={item.id} item={item} isActive={item.id === 'explorer'} />
        ))}
      </div>
      <div className="flex flex-col">
        {BOTTOM_ITEMS.map((item) => (
          <ActivityBarIcon key={item.id} item={item} isActive={false} />
        ))}
      </div>
    </div>
  )
}
