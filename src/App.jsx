import { useState, useCallback, useEffect } from 'react'
import {
  GitBranch, GitCommit, GitMerge,
  Upload, Download, CheckCircle2, Settings,
  Plus, ChevronDown, RotateCcw,
  Code2, Folder, X, Check,
  AlertCircle, Clock, Layers,
  RefreshCw, Terminal, Eye, Info, UserPlus
} from 'lucide-react'
import ProviderSetup from './components/ProviderSetup'
import { useProviders } from './hooks/useProviders'

// ─── Initial mock data (Fallback) ─────────────────────────────────────────────

const INITIAL_COMMITS = {
  main: [
    {
      id: 'a1b2c3d',
      message: 'Añadir autenticación de usuario con JWT',
      author: 'Ana García',
      initials: 'AG',
      color: '#14b8a6',
      time: 'hace 2 horas',
      branch: 'main',
      tags: ['HEAD', 'origin/main'],
    }
  ]
}

const INITIAL_FILES = [
  { id: 1, name: 'src/components/LoginForm.jsx', status: 'modified', checked: true },
]

const DIFF_CONTENT = {
  'src/components/LoginForm.jsx': [
    { type: 'context', line: "import React, { useState } from 'react'" },
    { type: 'added', line: "import { validateEmail, validatePassword } from '../utils'" },
  ]
}

const BRANCH_COLORS = {
  main: '#14b8a6',
  'feature-login': '#818cf8',
  'fix-styles': '#f472b6',
}

const STATUS_LABELS = {
  modified: { label: 'Modificado', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '~' },
  new: { label: 'Nuevo', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '+' },
  deleted: { label: 'Eliminado', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '-' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, color, avatarUrl, size = 'sm' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden`}
      style={{ backgroundColor: color + '30', color, border: `1.5px solid ${color}60` }}
    >
      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : initials}
    </div>
  )
}

function Modal({ title, subtitle, onClose, onConfirm, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/50 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold transition-all text-sm glow-teal-sm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function ToastNotification({ message, type = 'success', onDismiss }) {
  const styles = {
    success: 'border-brand-500/40 bg-brand-500/10 text-brand-300',
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    info: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  }
  const icons = { success: <CheckCircle2 size={16} />, error: <AlertCircle size={16} />, info: <Info size={16} /> }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${styles[type]} shadow-lg animate-pulse-slow`}>
      {icons[type]}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}

function CreateRepoModal({ providers, onClose, onCreate }) {
  const [accountId, setAccountId] = useState(providers[0]?.id || '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!accountId) { setError('Selecciona una cuenta'); return }
    
    setLoading(true)
    setError('')
    try {
      await onCreate(accountId, { name: name.trim().toLowerCase().replace(/\s+/g, '-'), description, private: isPrivate })
      onClose()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <Modal title="Crear Nuevo Repositorio" onClose={onClose} onConfirm={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Cuenta destino</label>
          <select 
            value={accountId} 
            onChange={e => setAccountId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Nombre del repositorio</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="ej: mi-nuevo-proyecto"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Descripción (Opcional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Breve descripción del proyecto"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Privacidad</label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPrivate(false)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${!isPrivate ? 'bg-brand-500/20 border-brand-500 text-brand-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              🌍 Público
            </button>
            <button
              onClick={() => setIsPrivate(true)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${isPrivate ? 'bg-brand-500/20 border-brand-500 text-brand-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              🔒 Privado
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        {loading && <p className="text-xs text-brand-400 flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Creando repositorio e inicializando con README...</p>}
      </div>
    </Modal>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const {
    providers,
    allRepos,
    addProvider,
    removeProvider,
    refreshProvider,
    loadBranches,
    loadCommits,
    createNewRepo,
    hasProviders
  } = useProviders()

  const [activeRepo, setActiveRepo] = useState(null)
  const [activeBranch, setActiveBranch] = useState('main')
  const [localBranches, setLocalBranches] = useState(['main'])
  const [commits, setCommits] = useState(INITIAL_COMMITS)
  
  const [loadingData, setLoadingData] = useState(false)
  
  const [selectedCommit, setSelectedCommit] = useState(null)
  const [files, setFiles] = useState(INITIAL_FILES)
  const [commitMessage, setCommitMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [syncState, setSyncState] = useState('push')
  const [toast, setToast] = useState(null)
  const [showNewBranchModal, setShowNewBranchModal] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchError, setNewBranchError] = useState('')
  const [showRepoDropdown, setShowRepoDropdown] = useState(false)
  const [showProviderSetup, setShowProviderSetup] = useState(false)
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false)
  const [undoStack, setUndoStack] = useState([])
  const [commitLoading, setCommitLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  
  const [repoSearch, setRepoSearch] = useState('')

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Auto-select first repo when repos load
  useEffect(() => {
    if (hasProviders && allRepos.length > 0 && !activeRepo) {
      handleRepoSelect(allRepos[0])
    }
  }, [allRepos, hasProviders])

  const handleRepoSelect = async (repo) => {
    setActiveRepo(repo)
    setShowRepoDropdown(false)
    setLoadingData(true)
    try {
      const branchesData = await loadBranches(repo)
      const branchNames = branchesData.map(b => b.name)
      setLocalBranches(branchNames.length > 0 ? branchNames : ['main'])
      
      const defaultB = repo.defaultBranch || (branchNames.includes('main') ? 'main' : branchNames.includes('master') ? 'master' : branchNames[0])
      setActiveBranch(defaultB)
      
      if (defaultB) {
        const commitsData = await loadCommits(repo, defaultB)
        setCommits({ [defaultB]: commitsData })
      }
      showToast(`Repositorio "${repo.name}" cargado`, 'success')
    } catch (err) {
      showToast(`Error cargando repositorio: ${err.message}`, 'error')
      setCommits({})
    } finally {
      setLoadingData(false)
    }
  }

  const handleBranchSwitch = async (branch) => {
    if (branch === activeBranch) return
    setActiveBranch(branch)
    setSelectedCommit(null)
    setSelectedFile(null)
    
    if (activeRepo && !commits[branch]) {
        setLoadingData(true)
        try {
            const commitsData = await loadCommits(activeRepo, branch)
            setCommits(prev => ({ ...prev, [branch]: commitsData }))
            showToast(`Ramas actualizadas: "${branch}"`, 'info')
        } catch (err) {
             showToast(`Error cargando commits: ${err.message}`, 'error')
        } finally {
            setLoadingData(false)
        }
    } else {
        showToast(`Cambiado a la rama "${branch}"`, 'info')
    }
  }

  const filteredRepos = allRepos.filter(r => r.fullName.toLowerCase().includes(repoSearch.toLowerCase()))

  // Derived
  const activeCommits = commits[activeBranch] || []
  const checkedFiles = files.filter(f => f.checked)
  const syncStates = {
    pull: { label: 'Descargar cambios', icon: <Download size={15} />, color: 'bg-indigo-500 hover:bg-indigo-400', glow: 'shadow-indigo-500/30' },
    push: { label: 'Subir mis cambios', icon: <Upload size={15} />, color: 'bg-brand-500 hover:bg-brand-400', glow: 'shadow-brand-500/30' },
    synced: { label: 'Todo actualizado', icon: <CheckCircle2 size={15} />, color: 'bg-emerald-600 hover:bg-emerald-500', glow: 'shadow-emerald-500/30' },
  }
  const currentSync = syncStates[syncState]

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setSyncLoading(false)
    if (syncState === 'push') {
      setSyncState('synced')
      showToast('¡Cambios subidos correctamente a origin!', 'success')
    } else if (syncState === 'pull') {
      setSyncState('synced')
      showToast('¡Repositorio actualizado con los últimos cambios!', 'success')
    } else {
      setSyncState('pull')
      showToast('Se detectaron cambios remotos nuevos', 'info')
    }
  }

  const handleToggleFile = (id) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, checked: !f.checked } : f))
  }

  const handleSelectAll = () => {
    const allChecked = files.every(f => f.checked)
    setFiles(prev => prev.map(f => ({ ...f, checked: !allChecked })))
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    if (checkedFiles.length === 0) return

    setCommitLoading(true)
    await new Promise(r => setTimeout(r, 1200))

    const newId = Math.random().toString(16).slice(2, 9)
    const newCommit = {
      id: newId,
      message: commitMessage,
      author: 'Tú',
      initials: 'TÚ',
      color: '#facc15',
      time: 'justo ahora',
      branch: activeBranch,
      tags: ['HEAD'],
    }

    setUndoStack(prev => [...prev, { type: 'commit', branch: activeBranch, commits: commits[activeBranch] }])
    
    setCommits(prev => {
      const branchCommits = prev[activeBranch] || []
      return {
        ...prev,
        [activeBranch]: [
          { ...newCommit },
          ...branchCommits.map(c => ({ ...c, tags: c.tags.filter(t => t !== 'HEAD') })),
        ],
      }
    })
    setFiles(prev => prev.filter(f => !f.checked))
    setCommitMessage('')
    setSelectedFile(null)
    setSyncState('push')
    setCommitLoading(false)
    showToast(`✓ Commit guardado: "${commitMessage.slice(0, 40)}..."`, 'success')
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    if (last.type === 'commit') {
      setCommits(prev => ({ ...prev, [last.branch]: last.commits }))
      setUndoStack(prev => prev.slice(0, -1))
      showToast('Último commit deshecho correctamente', 'info')
    }
  }

  const handleCreateBranch = () => {
    const trimmed = newBranchName.trim().replace(/\s+/g, '-').toLowerCase()
    if (!trimmed) { setNewBranchError('El nombre no puede estar vacío'); return }
    if (localBranches.includes(trimmed)) { setNewBranchError('Ya existe una rama con ese nombre'); return }
    if (!/^[a-z0-9._/-]+$/.test(trimmed)) { setNewBranchError('Solo letras, números, guiones y puntos'); return }

    const baseBranchCommits = commits[activeBranch] || []
    setLocalBranches(prev => [trimmed, ...prev])
    setCommits(prev => ({
      ...prev,
      [trimmed]: baseBranchCommits.map((c, i) => i === 0 ? { ...c, branch: trimmed, tags: ['HEAD'] } : { ...c, tags: c.tags.filter(t => t !== 'HEAD') }),
    }))
    setActiveBranch(trimmed)
    setShowNewBranchModal(false)
    setNewBranchName('')
    setNewBranchError('')
    showToast(`Rama "${trimmed}" creada y activada`, 'success')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[#080d18] text-slate-200 overflow-hidden font-sans">
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/50 glass z-20 flex-shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center shadow-lg">
            <GitBranch size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide text-gradient hidden sm:inline">MonGit</span>
        </div>

        {/* Repo selector */}
        <div className="relative">
          <button
            onClick={() => setShowRepoDropdown(p => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition-all text-sm text-slate-200 font-medium max-w-64"
          >
            {activeRepo ? (
              <>
                 <span className="text-sm" title={activeRepo.providerLabel}>{activeRepo.providerIcon}</span>
                 <span className="truncate">{activeRepo.name}</span>
              </>
            ) : (
              <>
                <Folder size={14} className="text-brand-400" />
                <span>Seleccionar Repositorio</span>
              </>
            )}
            <ChevronDown size={13} className={`text-slate-400 transition-transform flex-shrink-0 ${showRepoDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showRepoDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-80 rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-xl z-50 py-1.5 backdrop-blur flex flex-col max-h-[60vh]">
              <div className="px-3 pb-2 pt-1">
                 <input 
                   type="text" 
                   autoFocus
                   placeholder="Buscar repositorio..." 
                   value={repoSearch}
                   onChange={e => setRepoSearch(e.target.value)}
                   className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                 />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredRepos.length > 0 ? (
                  filteredRepos.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleRepoSelect(r)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${r.id === activeRepo?.id ? 'text-brand-400 font-medium' : 'text-slate-300'}`}
                    >
                      <span className="text-xs" title={r.providerLabel} style={{color: r.providerColor}}>{r.providerIcon}</span>
                      <div className="flex-1 min-w-0">
                         <div className="truncate">{r.name}</div>
                         <div className="text-[10px] text-slate-500 truncate">{r.owner}</div>
                      </div>
                      {r.id === activeRepo?.id && <Check size={13} className="flex-shrink-0 text-brand-400" />}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-500 text-center">No se encontraron repositorios</div>
                )}
              </div>
              <div className="border-t border-slate-700/50 mt-1 pt-1">
                <button 
                  onClick={() => { setShowRepoDropdown(false); setShowCreateRepoModal(true) }}
                  className="w-full text-left px-4 py-2 text-sm text-brand-400 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                >
                  <Plus size={13} />
                  Crear nuevo repositorio...
                </button>
                <button 
                  onClick={() => { setShowRepoDropdown(false); setShowProviderSetup(true) }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors flex items-center gap-2"
                >
                  <UserPlus size={13} />
                  Gestionar cuentas...
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-700/60 mx-1" />

        {/* Branch indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-sm">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: BRANCH_COLORS[activeBranch] || '#14b8a6' }} />
          <span className="font-mono text-xs text-slate-300 truncate max-w-32">{activeBranch}</span>
        </div>

        <div className="flex-1" />

        {/* Toast area */}
        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 z-50 w-auto min-w-64 max-w-sm">
            <ToastNotification message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={syncLoading || !activeRepo}
          className={`flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-xl text-white font-semibold text-xs sm:text-sm transition-all shadow-lg ${currentSync.color} ${currentSync.glow} disabled:opacity-60`}
        >
          {syncLoading
            ? <RefreshCw size={15} className="animate-spin" />
            : currentSync.icon}
          <span className="hidden sm:inline">{currentSync.label}</span>
        </button>
        
        <button 
          onClick={() => setShowProviderSetup(true)}
          className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white transition-all relative"
          title="Proveedores Git"
        >
          <Settings size={17} />
          {providers.length > 0 && (
             <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-500 rounded-full border border-slate-900" />
          )}
        </button>
      </header>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL (20%) ─────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 flex flex-col border-r border-slate-700/50 bg-[#0a0f1c] overflow-y-auto">
          <div className="p-3 space-y-5">
            <button
              onClick={() => setShowNewBranchModal(true)}
              disabled={!activeRepo}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-brand-500/50 text-brand-400 hover:bg-brand-500/10 hover:border-brand-400 transition-all text-sm font-semibold group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} className="group-hover:rotate-90 transition-transform duration-200" />
              Nueva Rama
            </button>

            <div>
              <div className="flex items-center gap-2 px-1 mb-2">
                <GitBranch size={13} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Mis Ramas</span>
              </div>
              {loadingData && !localBranches.length ? (
                 <div className="flex justify-center py-4"><RefreshCw size={16} className="animate-spin text-slate-500" /></div>
              ) : (
                <div className="space-y-1">
                  {localBranches.map(branch => {
                    const isActive = branch === activeBranch
                    const color = BRANCH_COLORS[branch] || '#94a3b8'
                    return (
                      <button
                        key={branch}
                        onClick={() => handleBranchSwitch(branch)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group relative overflow-hidden ${
                          isActive
                            ? 'bg-slate-700/60 border border-slate-600/60'
                            : 'hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute inset-0 rounded-xl opacity-10" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                        )}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: isActive ? color : '#334155' }} />
                        <span className={`text-sm font-mono truncate ${isActive ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {branch}
                        </span>
                        {isActive && <CheckCircle2 size={13} className="ml-auto flex-shrink-0" style={{ color }} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            
            {activeRepo?.defaultBranch && (
              <div>
                <div className="flex items-center gap-2 px-1 mb-2 mt-4">
                  <GitMerge size={13} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Remotas</span>
                </div>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-800/60 border border-transparent transition-all group opacity-70 cursor-not-allowed">
                     <div className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                     <span className="text-sm font-mono text-slate-500 truncate">origin/{activeRepo.defaultBranch}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER PANEL (50%) — Commit Graph ────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden border-r border-slate-700/50 relative">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-brand-400" />
              <span className="font-semibold text-sm text-white">Historial de cambios</span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-mono">{activeCommits.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
            {!hasProviders && !activeRepo && (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                   <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <UserPlus size={24} className="text-brand-400" />
                   </div>
                   <h2 className="text-xl font-bold text-white mb-2">Bienvenido a MonGit</h2>
                   <p className="text-sm text-slate-400 max-w-sm mb-6">Para empezar, conecta tu cuenta de GitHub, GitLab, Bitbucket, Codeberg o Gitea.</p>
                   <button 
                     onClick={() => setShowProviderSetup(true)}
                     className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold transition-all shadow-lg shadow-brand-500/25 glow-teal text-sm"
                   >
                     Conectar cuenta Git
                   </button>
                </div>
            )}
            
            {loadingData && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                   <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-xl">
                      <RefreshCw size={18} className="animate-spin text-brand-400" />
                      <span className="text-sm font-medium text-slate-200">Cargando datos...</span>
                   </div>
                </div>
            )}
            
            {activeCommits.map((commit, index) => {
              const isSelected = selectedCommit?.id === commit.id
              const branchColor = commit.color || BRANCH_COLORS[commit.branch] || BRANCH_COLORS[activeBranch] || '#14b8a6'
              const isFirst = index === 0
              const isLast = index === activeCommits.length - 1
              return (
                <div key={`${commit.id}-${index}`} className="flex gap-0">
                  <div className="flex flex-col items-center w-10 flex-shrink-0">
                    <div className={`w-0.5 flex-1 min-h-3 ${isFirst ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: branchColor + '60' }} />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 z-10 transition-all duration-200 cursor-pointer ${
                        isSelected ? 'scale-125' : 'hover:scale-110'
                      }`}
                      style={{
                        borderColor: branchColor,
                        backgroundColor: isSelected ? branchColor : '#0a0f1c',
                        boxShadow: isSelected ? `0 0 12px ${branchColor}80` : `0 0 6px ${branchColor}40`,
                      }}
                      onClick={() => setSelectedCommit(isSelected ? null : commit)}
                    />
                    <div className={`w-0.5 flex-1 min-h-3 ${isLast ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: branchColor + '60' }} />
                  </div>

                  <div
                    className={`flex-1 ml-2 my-1 rounded-xl border cursor-pointer transition-all duration-200 p-3 group ${
                      isSelected
                        ? 'bg-slate-800/80 border-slate-600/80 shadow-lg'
                        : 'bg-slate-900/30 border-slate-800/50 hover:bg-slate-800/40 hover:border-slate-700/60'
                    }`}
                    onClick={() => setSelectedCommit(isSelected ? null : commit)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar initials={commit.initials} color={branchColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {commit.tags?.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold"
                              style={{
                                backgroundColor: tag === 'HEAD' ? '#14b8a625' : '#818cf825',
                                color: tag === 'HEAD' ? '#14b8a6' : '#818cf8',
                                border: `1px solid ${tag === 'HEAD' ? '#14b8a6' : '#818cf8'}40`,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className={`text-sm font-medium mt-0.5 truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                          {commit.message || '(Sin mensaje)'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500 truncate max-w-[120px]">{commit.author}</span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11} />
                            {commit.time}
                          </span>
                          <span className="font-mono text-xs text-slate-700 ml-auto flex-shrink-0">
                            {commit.id.slice(0, 7)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-2">
                         {commit.url ? (
                            <a 
                              href={commit.url} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 text-slate-300 text-xs transition-all col-span-2"
                            >
                              Ver en {activeRepo?.providerLabel?.split(' ')[0]}
                            </a>
                         ) : (
                           <>
                              <button
                                onClick={e => { e.stopPropagation(); showToast(`Función próximamente`, 'info') }}
                                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 text-slate-400 text-xs transition-all"
                              >
                                <Code2 size={12} /> Ver diff completo
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); showToast(`Función próximamente`, 'info') }}
                                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 text-slate-400 text-xs transition-all"
                              >
                                <RotateCcw size={12} /> Revertir
                              </button>
                           </>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        {/* ── RIGHT PANEL (30%) — Staging Area ─────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 flex flex-col bg-[#090e1b] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <GitCommit size={15} className="text-brand-400" />
              <span className="font-semibold text-sm text-white">Área de cambios locales</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-3 space-y-1">
              {files.map(file => {
                  const status = STATUS_LABELS[file.status]
                  const isSelectedFile = selectedFile?.id === file.id
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all cursor-pointer group ${
                        isSelectedFile
                          ? 'bg-slate-700/50 border-slate-600/60'
                          : 'border-transparent hover:bg-slate-800/50 hover:border-slate-700/40'
                      }`}
                      onClick={() => setSelectedFile(isSelectedFile ? null : file)}
                    >
                      <input
                        type="checkbox"
                        checked={file.checked}
                        onChange={() => handleToggleFile(file.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-teal-500 flex-shrink-0 cursor-pointer"
                      />
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${status.bg} ${status.color}`}>
                        {status.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate font-mono">{file.name.split('/').pop()}</p>
                        <p className="text-[10px] text-slate-500 truncate">{file.name.split('/').slice(0, -1).join('/')}/</p>
                      </div>
                    </div>
                  )
              })}
            </div>

            {selectedFile && DIFF_CONTENT[selectedFile.name] && (
              <div className="mx-3 mb-3 rounded-xl border border-slate-700/50 bg-slate-950/60 overflow-hidden flex-shrink-0">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/30 bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <Code2 size={12} className="text-slate-400" />
                    <span className="text-[11px] font-mono text-slate-400 truncate">{selectedFile.name.split('/').pop()}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-slate-600 hover:text-slate-400">
                    <X size={12} />
                  </button>
                </div>
                <div className="overflow-auto max-h-48 p-2 space-y-0.5">
                  {DIFF_CONTENT[selectedFile.name].map((line, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 px-2 py-0.5 rounded text-[11px] font-mono ${
                        line.type === 'added' ? 'bg-emerald-500/10 text-emerald-300' :
                        line.type === 'removed' ? 'bg-rose-500/10 text-rose-300' :
                        'text-slate-500'
                      }`}
                    >
                      <span className="flex-shrink-0 w-3 opacity-60">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                      </span>
                      <span className="break-all">{line.line || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto p-3 pt-0 space-y-3 flex-shrink-0">
              <div className="border-t border-slate-700/30 pt-3">
                <textarea
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="Mensaje del commit..."
                  rows={2}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-all font-mono"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit()
                  }}
                />
              </div>

              <button
                onClick={handleCommit}
                disabled={commitLoading || !commitMessage.trim() || checkedFiles.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm transition-all shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed glow-teal"
              >
                {commitLoading ? <RefreshCw size={15} className="animate-spin" /> : <GitCommit size={15} />}
                Guardar localmente
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── STATUS BAR ──────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-slate-700/50 glass-light flex-shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Terminal size={12} className="text-brand-400" />
            <span>{checkedFiles.length} cambios preparados</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            <RotateCcw size={11} className="group-hover:-rotate-45 transition-transform" />
            <span>Deshacer</span>
          </button>
        </div>
      </footer>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {showNewBranchModal && (
        <Modal
          title="Nueva Rama"
          subtitle={`A partir de "${activeBranch}"`}
          onClose={() => { setShowNewBranchModal(false); setNewBranchName(''); setNewBranchError('') }}
          onConfirm={handleCreateBranch}
        >
          <div className="space-y-3">
             <input
                autoFocus
                type="text"
                value={newBranchName}
                onChange={e => { setNewBranchName(e.target.value); setNewBranchError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                placeholder="ej: feature-perfil"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-brand-500 focus:outline-none"
             />
             {newBranchError && <p className="text-xs text-rose-400">{newBranchError}</p>}
          </div>
        </Modal>
      )}

      {showProviderSetup && (
         <ProviderSetup 
           providers={providers}
           onAdd={addProvider}
           onRemove={removeProvider}
           onRefresh={refreshProvider}
           onClose={() => setShowProviderSetup(false)}
         />
      )}

      {showCreateRepoModal && (
        <CreateRepoModal
          providers={providers}
          onClose={() => setShowCreateRepoModal(false)}
          onCreate={async (accountId, details) => {
            await createNewRepo(accountId, details)
            showToast(`Repositorio "${details.name}" creado con éxito`, 'success')
            // Refresh logic triggers useProviders to update allRepos,
            // we could also auto-select it here, but user can easily pick it from dropdown now.
          }}
        />
      )}
    </div>
  )
}
