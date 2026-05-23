import { useState } from 'react'
import {
  X, Search, Folder, RefreshCw, CheckCircle2,
  AlertCircle, Cloud, HelpCircle, ShieldAlert
} from 'lucide-react'

export default function CloneRepoModal({ providers, allRepos, onClose, onCloneSuccess }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [parentFolder, setParentFolder] = useState('')
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState('')
  const [selectedProviderId, setSelectedProviderId] = useState('all')

  const isElectron = !!window.electronAPI

  // Get list of connected account IDs that are actually active
  const activeProviders = providers.filter(p => p.status === 'connected')

  // Filter repositories based on search and selected provider filter
  const filteredRepos = allRepos.filter(repo => {
    const matchesSearch = repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesProvider = selectedProviderId === 'all' || repo.providerAccountId === selectedProviderId
    
    return matchesSearch && matchesProvider
  })

  // Open directory selection dialog
  const handleSelectFolder = async () => {
    if (!isElectron) return
    const path = await window.electronAPI.selectFolder()
    if (path) {
      setParentFolder(path)
      setError('')
    }
  }

  // Build the clone URL with credentials embedded for frictionless remote operations
  const buildAuthenticatedUrl = (repo) => {
    const { provider, creds, fullName } = repo
    if (!creds) return repo.url // Fallback to original URL if no creds found

    if (provider === 'github') {
      return `https://${creds.token}@github.com/${fullName}.git`
    }
    if (provider === 'gitlab') {
      return `https://oauth2:${creds.token}@gitlab.com/${fullName}.git`
    }
    if (provider === 'codeberg') {
      return `https://${creds.token}@codeberg.org/${fullName}.git`
    }
    if (provider === 'gitea') {
      const cleanUrl = (creds.url || '').replace(/^https?:\/\//, '')
      return `https://${creds.token}@${cleanUrl}/${fullName}.git`
    }
    if (provider === 'bitbucket') {
      return `https://${creds.username}:${creds.appPassword}@bitbucket.org/${fullName}.git`
    }
    return repo.url
  }

  const handleClone = async () => {
    if (!selectedRepo) {
      setError('Por favor selecciona un repositorio para clonar')
      return
    }
    if (!parentFolder) {
      setError('Por favor selecciona la carpeta de destino local')
      return
    }

    setCloning(true)
    setError('')
    
    try {
      const authUrl = buildAuthenticatedUrl(selectedRepo)
      const repoDirectoryName = selectedRepo.name

      const result = await window.electronAPI.gitClone(authUrl, parentFolder, repoDirectoryName)
      
      if (result.success) {
        if (onCloneSuccess) {
          onCloneSuccess(result.clonedPath)
        }
        onClose()
      } else {
        setError(result.error || 'Ocurrió un error inesperado al clonar el repositorio.')
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el sistema de clonación.')
    } finally {
      setCloning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={!cloning ? onClose : undefined} 
      />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-500 flex items-center justify-center shadow-lg">
              <Cloud size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Clonar Repositorio Remoto</h2>
              <p className="text-xs text-slate-400">
                Selecciona un proyecto de tu cuenta en la nube para traerlo a tu equipo local.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cloning}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 flex flex-col min-h-0">
          {activeProviders.length === 0 ? (
            <div className="text-center py-8 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center">
              <ShieldAlert size={36} className="text-amber-500 mb-3" />
              <p className="text-sm font-semibold text-slate-300">No hay cuentas Git conectadas</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md px-4">
                Primero debes conectar una cuenta (como GitHub, GitLab o Gitea) en la sección de configuración para poder listar tus repositorios.
              </p>
            </div>
          ) : (
            <>
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar repositorio por nombre o descripción..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                  />
                </div>
                
                {/* Account filter */}
                <select
                  value={selectedProviderId}
                  onChange={e => setSelectedProviderId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Todas las cuentas</option>
                  {activeProviders.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Repositories List */}
              <div className="flex-1 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col bg-slate-900/50 min-h-[180px]">
                <div className="px-4 py-2 bg-slate-800/40 border-b border-slate-700/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                  <span>Proyecto ({filteredRepos.length})</span>
                  <span>Último push</span>
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 max-h-[220px]">
                  {filteredRepos.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      {searchQuery ? 'No se encontraron repositorios que coincidan con la búsqueda.' : 'No tienes repositorios disponibles.'}
                    </div>
                  ) : (
                    filteredRepos.map(repo => {
                      const isSelected = selectedRepo?.id === repo.id
                      const timeStr = repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : 'N/D'
                      return (
                        <button
                          key={repo.id}
                          onClick={() => {
                            if (!cloning) {
                              setSelectedRepo(repo)
                              setError('')
                            }
                          }}
                          className={`w-full px-4 py-3 flex items-center justify-between text-left transition-all text-xs group ${
                            isSelected
                              ? 'bg-indigo-500/10 border-l-4 border-indigo-500 text-white'
                              : 'hover:bg-slate-800/40 text-slate-300 hover:text-white border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate pr-4">
                            <span className="text-lg">{repo.provider === 'github' ? '🐙' : repo.provider === 'gitlab' ? '🦊' : '🔗'}</span>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm truncate">{repo.fullName}</span>
                                {repo.private ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">Privado</span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">Público</span>
                                )}
                              </div>
                              {repo.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">{repo.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-500 font-mono text-[10px] flex-shrink-0">{timeStr}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Local Folder Selector */}
              <div className="space-y-2 bg-slate-800/20 border border-slate-700/30 p-4 rounded-xl flex-shrink-0">
                <label className="text-xs font-semibold text-slate-400 block">Carpeta de destino local</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono flex items-center truncate min-h-[38px]">
                    {parentFolder ? (
                      <span className="text-slate-200 truncate">{parentFolder}</span>
                    ) : (
                      <span className="text-slate-500">Selecciona la carpeta donde quieres clonar el proyecto...</span>
                    )}
                  </div>
                  <button
                    onClick={handleSelectFolder}
                    disabled={cloning}
                    className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Folder size={13} className="text-brand-400" />
                    Examinar
                  </button>
                </div>
                {selectedRepo && parentFolder && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    👉 Se creará la carpeta: <span className="font-mono text-indigo-400">{parentFolder}\{selectedRepo.name}</span>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Feedback Area */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex-shrink-0">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span className="break-all">{error}</span>
            </div>
          )}
          
          {cloning && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex-shrink-0 animate-pulse-slow">
              <RefreshCw size={15} className="animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">Clonando repositorio remoto...</p>
                <p className="text-[10px] text-indigo-400/80 mt-0.5">Esto puede demorar unos segundos dependiendo del tamaño del proyecto.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-950/30 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={cloning}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleClone}
            disabled={cloning || !selectedRepo || !parentFolder}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              cloning || !selectedRepo || !parentFolder
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {cloning ? (
              <><RefreshCw size={13} className="animate-spin" /> Clonando...</>
            ) : (
              <>Clonar Proyecto</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
