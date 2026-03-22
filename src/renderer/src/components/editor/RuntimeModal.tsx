import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, DownloadSimple, Trash, Check, CircleNotch, HardDrives, MagnifyingGlass } from '@phosphor-icons/react'

/* ── Tipos ─────────────────────────────────────────────── */

interface NodeVersion {
  version: string
  lts: string | false
  date: string
}

interface InstalledRuntime {
  version: string
  label: string
  path: string
}

interface RuntimeModalProps {
  onClose: () => void
}

type Filter = 'all' | 'lts' | 'current' | 'installed'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'lts', label: 'LTS' },
  { key: 'current', label: 'Current' },
  { key: 'installed', label: 'Instalados' },
]

/* ── Componente ────────────────────────────────────────── */

export default function RuntimeModal({ onClose }: RuntimeModalProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [installed, setInstalled] = useState<InstalledRuntime[]>([])
  const [available, setAvailable] = useState<NodeVersion[]>([])
  const [active, setActive] = useState('embedded')
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const installedSet = useMemo(
    () => new Set(installed.map((i) => i.version)),
    [installed],
  )

  const embeddedLabel = useMemo(
    () => installed.find((i) => i.version === 'embedded')?.label ?? 'Embedded',
    [installed],
  )

  // Cargar todo al montar
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inst, avail, act] = await Promise.all([
        window.cristalAPI.runtimeListInstalled(),
        window.cristalAPI.runtimeListAvailable(),
        window.cristalAPI.runtimeGetActive(),
      ])
      setInstalled(inst)
      setAvailable(avail)
      setActive(act)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando versiones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Progreso de descarga
  useEffect(() => {
    const unsub = window.cristalAPI.onRuntimeInstallProgress((pct) => setProgress(pct))
    return unsub
  }, [])

  // Enfocar el campo de búsqueda
  useEffect(() => { searchRef.current?.focus() }, [])

  // Lista filtrada
  const filtered = useMemo(() => {
    let list = available

    if (filter === 'lts') list = list.filter((v) => v.lts !== false)
    else if (filter === 'current') list = list.filter((v) => v.lts === false)
    else if (filter === 'installed') list = list.filter((v) => installedSet.has(v.version))

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (v) =>
          v.version.toLowerCase().includes(q) ||
          (typeof v.lts === 'string' && v.lts.toLowerCase().includes(q)) ||
          v.date.includes(q),
      )
    }

    return list
  }, [available, filter, search, installedSet])

  // ¿Mostrar fila de Embedded?
  const showEmbedded = useMemo(() => {
    if (filter === 'lts' || filter === 'current') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return embeddedLabel.toLowerCase().includes(q) || 'embedded'.includes(q)
    }
    return true
  }, [filter, search, embeddedLabel])

  const handleActivate = useCallback(async (version: string) => {
    await window.cristalAPI.runtimeSetActive(version)
    setActive(version)
  }, [])

  const handleInstall = useCallback(async (version: string) => {
    setInstalling(version)
    setProgress(0)
    setError(null)
    try {
      await window.cristalAPI.runtimeInstall(version)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de instalación')
    } finally {
      setInstalling(null)
    }
  }, [refresh])

  const handleUninstall = useCallback(async (version: string) => {
    await window.cristalAPI.runtimeUninstall(version)
    await refresh()
  }, [refresh])

  return (
    <div className="cristal-prompt-backdrop" onClick={onClose}>
      <div className="cristal-runtime" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="cristal-runtime__header">
          <div className="cristal-runtime__header-left">
            <HardDrives size={16} weight="duotone" style={{ color: 'var(--cristal-accent)' }} />
            <span className="cristal-runtime__title">Node.js Runtimes</span>
          </div>
          <button type="button" onClick={onClose} className="cristal-prompt__close">
            <X size={12} weight="bold" />
          </button>
        </div>

        {/* Buscador */}
        <div className="cristal-runtime__search">
          <MagnifyingGlass size={12} weight="bold" className="cristal-runtime__search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar versión…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cristal-runtime__search-input"
          />
        </div>

        {/* Filtros */}
        <div className="cristal-runtime__filters">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`cristal-runtime__filter${filter === key ? ' cristal-runtime__filter--active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="cristal-runtime__error">{error}</div>}

        {/* Contenido */}
        <div className="cristal-runtime__body">
          {loading && (
            <div className="cristal-runtime__loading">
              <CircleNotch size={18} className="cristal-spin" style={{ color: 'var(--cristal-accent)' }} />
            </div>
          )}

          {/* Embedded runtime — visible en Todos e Instalados */}
          {!loading && showEmbedded && (
            <div className="cristal-runtime__item cristal-runtime__item--embedded">
              <div className="cristal-runtime__item-info">
                <span className="cristal-runtime__item-label">{embeddedLabel}</span>
                {active === 'embedded' && (
                  <span className="cristal-runtime__active-badge">activo</span>
                )}
              </div>
              <div className="cristal-runtime__item-actions">
                {active !== 'embedded' && (
                  <button
                    type="button"
                    className="cristal-runtime__action cristal-runtime__action--activate"
                    onClick={() => handleActivate('embedded')}
                    title="Usar runtime embebido"
                  >
                    <Check size={12} weight="bold" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de versiones */}
          {!loading && filtered.map((v) => {
            const isInstalled = installedSet.has(v.version)
            const isActive = v.version === active
            const isInstalling = installing === v.version

            return (
              <div key={v.version} className="cristal-runtime__item">
                <div className="cristal-runtime__item-info">
                  <span className="cristal-runtime__item-label">Node.js {v.version}</span>
                  {v.lts && <span className="cristal-runtime__lts-badge">{v.lts}</span>}
                  {isActive && <span className="cristal-runtime__active-badge">activo</span>}
                  {isInstalled && !isActive && (
                    <span className="cristal-runtime__installed-badge">instalado</span>
                  )}
                  <span className="cristal-runtime__item-date">{v.date}</span>
                </div>
                <div className="cristal-runtime__item-actions">
                  {isInstalling ? (
                    <div className="cristal-runtime__progress">
                      <div className="cristal-runtime__progress-bar" style={{ width: `${progress}%` }} />
                      <span className="cristal-runtime__progress-text">{progress}%</span>
                    </div>
                  ) : isInstalled ? (
                    <>
                      {!isActive && (
                        <button
                          type="button"
                          className="cristal-runtime__action cristal-runtime__action--activate"
                          onClick={() => handleActivate(v.version)}
                          title="Usar esta versión"
                        >
                          <Check size={12} weight="bold" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="cristal-runtime__action cristal-runtime__action--delete"
                        onClick={() => handleUninstall(v.version)}
                        title="Desinstalar"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="cristal-runtime__action cristal-runtime__action--install"
                      onClick={() => handleInstall(v.version)}
                      disabled={installing !== null}
                      title="Instalar"
                    >
                      <DownloadSimple size={12} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {!loading && filtered.length === 0 && !showEmbedded && (
            <span className="cristal-runtime__empty">
              {search ? 'Sin resultados para la búsqueda' : 'No hay versiones en esta categoría'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
