import {
  Files,
  MagnifyingGlass,
  GitBranch,
  BookOpen,
  AppWindow,
  Gear,
  User,
} from '@phosphor-icons/react'

/**
 * Barra de actividad vertical izquierda (48px fijo).
 * Iconos Phosphor Thin para un aspecto limpio y premium propio de CristalCE.
 * Indicador lateral cian en el icono activo.
 */

interface ActivityBarItem {
  icon: React.ElementType
  label: string
  id: string
}

const TOP_ITEMS: ActivityBarItem[] = [
  { icon: Files, label: 'Explorador', id: 'explorer' },
  { icon: MagnifyingGlass, label: 'Búsqueda', id: 'search' },
  { icon: GitBranch, label: 'Control de versiones', id: 'git' },
  { icon: BookOpen, label: 'Documentación', id: 'docs' },
  { icon: AppWindow, label: 'Extensiones', id: 'extensions' },
]

const BOTTOM_ITEMS: ActivityBarItem[] = [
  { icon: User, label: 'Cuenta', id: 'account' },
  { icon: Gear, label: 'Configuración', id: 'settings' },
]

function ActivityBarIcon({ item, isActive }: { item: ActivityBarItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <button
      title={item.label}
      className={`
        relative flex h-11 w-full items-center justify-center
        transition-colors duration-100
        ${isActive
          ? 'text-[var(--cristal-accent)] before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:w-[2px] before:rounded-r before:bg-[var(--cristal-accent)]'
          : 'text-[var(--cristal-text-faint)] hover:text-[var(--cristal-text-muted)]'
        }
      `}
    >
      <Icon size={22} weight="light" />
    </button>
  )
}

export default function ActivityBar() {
  return (
    <div
      className="flex h-full w-12 shrink-0 flex-col justify-between py-1"
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
