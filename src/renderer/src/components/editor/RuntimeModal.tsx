import { useState, useEffect, useCallback } from 'react'
import { X, DownloadSimple, Trash, Check, CircleNotch, HardDrives } from '@phosphor-icons/react'

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

/* ── Componente ────────────────────────────────────────── */

export default function RuntimeModal({ onClose }: RuntimeModalProps) {
  const [tab, setTab] = useState<'installed' | 'available'>('installed')
  const [installed, setInstalled] = useState<InstalledRuntime[]>([])
  const [available, setAvailable] = useState<NodeVersion[]>([])
  const [active, setActive] = useState('embedded')
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos iniciales
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [inst, act] = await Promise.all([
        window.cristalAPI.runtimeListInstalled(),
        window.cristalAPI.runtimeGetActive(),
      ])
      setInstalled(inst)
      setActive(act)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Cargar versiones disponibles al cambiar a esa pestaña
  useEffect(() => {
    if (tab !== 'available' || available.length > 0) return
    setLoading(true)
    window.cristalAPI.runtimeListAvailable()
      .then(setAvailable)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [tab, available.length])

  // Listener de progreso de instalación
  useEffect(() => {
    const unsub = window.cristalAPI.onRuntimeInstallProgress((pct) => {
      setProgress(pct)
    })
    return unsub
  }, [])

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
      setTab('installed')
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

  // Versiones disponibles que NO están instaladas ya
  const installedSet = new Set(installed.map((i) => i.version))
  const filteredAvailable = available.filter((v) => !installedSet.has(v.version))

  return (
    <div className="cristal-prompt-backdrop" onClick={onClose}>
      <div className="cristal-runtime" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="cristal-runtime__header">
          <div className="cristal-runtime__header-left">
            <HardDrives size={16} weight="duotone" style={{ color: 'var(--cristal-accent)' }} />
            <span className="cristal-runtime__title">Runtimes</span>
          </div>
          <button type="button" onClick={onClose} className="cristal-prompt__close">
            <X size={12} weight="bold" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="cristal-runtime__tabs">
          <button
            type="button"
            className={`cristal-runtime__tab ${tab === 'installed' ? 'cristal-runtime__tab--active' : ''}`}
            onClick={() => setTab('installed')}
          >
            Instalados
          </button>
          <button
            type="button"
            className={`cristal-runtime__tab ${tab === 'available' ? 'cristal-runtime__tab--active' : ''}`}
            onClick={() => setTab('available')}
          >
            Disponibles
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="cristal-runtime__error">{error}</div>
        )}

        {/* Contenido */}
        <div className="cristal-runtime__body">
          {loading && installed.length === 0 && (
            <div className="cristal-runtime__loading">
              <CircleNotch size={18} className="cristal-spin" style={{ color: 'var(--cristal-accent)' }} />
            </div>
          )}

          {/* Pestaña: Instalados */}
          {tab === 'installed' && installed.map((rt) => (
            <div key={rt.version} className="cristal-runtime__item">
              <div className="cristal-runtime__item-info">
                <span className="cristal-runtime__item-label">{rt.label}</span>
                {rt.version === active && (
                  <span className="cristal-runtime__active-badge">activo</span>
                )}
              </div>
              <div className="cristal-runtime__item-actions">
                {rt.version !== active && (
                  <button
                    type="button"
                    className="cristal-runtime__action cristal-runtime__action--activate"
                    onClick={() => handleActivate(rt.version)}
                    title="Usar esta versión"
                  >
                    <Check size={12} weight="bold" />
                  </button>
                )}
                {rt.version !== 'embedded' && (
                  <button
                    type="button"
                    className="cristal-runtime__action cristal-runtime__action--delete"
                    onClick={() => handleUninstall(rt.version)}
                    title="Desinstalar"
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pestaña: Disponibles */}
          {tab === 'available' && filteredAvailable.map((v) => {
            const isInstalling = installing === v.version
            return (
              <div key={v.version} className="cristal-runtime__item">
                <div className="cristal-runtime__item-info">
                  <span className="cristal-runtime__item-label">
                    Node.js {v.version}
                  </span>
                  {v.lts && (
                    <span className="cristal-runtime__lts-badge">{v.lts}</span>
                  )}
                  <span className="cristal-runtime__item-date">{v.date}</span>
                </div>
                <div className="cristal-runtime__item-actions">
                  {isInstalling ? (
                    <div className="cristal-runtime__progress">
                      <div className="cristal-runtime__progress-bar" style={{ width: `${progress}%` }} />
                      <span className="cristal-runtime__progress-text">{progress}%</span>
                    </div>
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

          {tab === 'available' && !loading && filteredAvailable.length === 0 && available.length > 0 && (
            <span className="cristal-runtime__empty">Todas las versiones disponibles ya están instaladas</span>
          )}
        </div>
      </div>
    </div>
  )
}
