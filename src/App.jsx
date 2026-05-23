import { useState, useCallback, useEffect } from 'react'
import {
  GitBranch, GitCommit, GitMerge,
  Upload, Download, CheckCircle2, Settings,
  Plus, ChevronDown, RotateCcw,
  Code2, Folder, FolderPlus, X, Check,
  AlertCircle, Clock, Layers,
  RefreshCw, Terminal, Eye, Info, UserPlus, Trash2
} from 'lucide-react'
import { useProviders } from './hooks/useProviders'
import ProviderSetup from './components/ProviderSetup'
import LocalRepoPanel from './components/LocalRepoPanel'
import MergePanel from './components/MergePanel'
import CloneRepoModal from './components/CloneRepoModal'

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
      await onCreate(accountId, { 
        name: name.trim().replace(/\s+/g, '-'), 
        description, 
        private: isPrivate
      })
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
        {error && <p className="text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle size={11} className="flex-shrink-0" />
          <span>{error} — <button onClick={handleSubmit} className="underline hover:text-rose-300 font-medium ml-1">Inténtelo de nuevo</button></span>
        </p>}
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
  const [localFolderPath, setLocalFolderPath] = useState(null)
  const [activeBranch, setActiveBranch] = useState('main')
  const [localBranches, setLocalBranches] = useState([])
  const [commits, setCommits] = useState({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
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
  const [branchToDelete, setBranchToDelete] = useState(null)
  const [deleteRemoteBranch, setDeleteRemoteBranch] = useState(false)
  const [showRepoDropdown, setShowRepoDropdown] = useState(false)
  const [showProviderSetup, setShowProviderSetup] = useState(false)
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false)
  const [showCloneRepoModal, setShowCloneRepoModal] = useState(false)
  const [undoStack, setUndoStack] = useState([]);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('history')
  
  const [repoSearch, setRepoSearch] = useState('')

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Auto-select first repo when repos load (disabled for local first)
  useEffect(() => {
    // We start empty, user needs to select folder
  }, [])

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return
    const path = await window.electronAPI.selectFolder()
    if (path) {
      setLocalFolderPath(path)
      setShowRepoDropdown(false)
      loadLocalRepoData(path)
    }
  }

  const handleCreateRepoClick = () => {
    if (providers.length === 0) {
      showToast('Por favor, conecta una cuenta en la nube (como GitHub) primero.', 'info')
      setShowProviderSetup(true)
    } else {
      setShowCreateRepoModal(true)
    }
  }

  const handleCloneRepoClick = () => {
    if (providers.length === 0) {
      showToast('Por favor, conecta una cuenta en la nube (como GitHub) primero.', 'info')
      setShowProviderSetup(true)
    } else {
      setShowCloneRepoModal(true)
    }
  }

  const loadLocalRepoData = async (path, specificBranch = null) => {
    setLoadingData(true)
    try {
      const { branches, activeBranch: currentBranch } = await window.electronAPI.getBranches(path)
      setLocalBranches(branches)
      const branchToLoad = specificBranch || currentBranch || 'main'
      setActiveBranch(branchToLoad)
      
      const commitsData = await window.electronAPI.getCommits(path, branchToLoad)
      setCommits(prev => ({ ...prev, [branchToLoad]: commitsData }))
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      showToast('Error cargando repositorio local', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  const handleBranchSwitch = async (branch) => {
    if (branch === activeBranch) return
    if (!localFolderPath) return
    
    setSelectedCommit(null)
    setSelectedFile(null)
    setLoadingData(true)
    const result = await window.electronAPI.checkoutBranch(localFolderPath, branch)
    if (result.success) {
      loadLocalRepoData(localFolderPath, branch)
      showToast(`Cambiado a la rama "${branch}"`, 'info')
    } else {
      showToast(`Error al cambiar de rama: ${result.error}`, 'error')
      setLoadingData(false)
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
    if (!localFolderPath) return
    setSyncLoading(true)
    try {
      const pullResult = await window.electronAPI.pullChanges(localFolderPath)
      if (!pullResult.success) {
        showToast(`Error al hacer pull: ${pullResult.error}`, 'error')
        setSyncLoading(false)
        return
      }

      const pushResult = await window.electronAPI.pushChanges(localFolderPath)
      if (!pushResult.success) {
        showToast(`Error al hacer push: ${pushResult.error}`, 'error')
        setSyncLoading(false)
        return
      }

      showToast('Sincronizado correctamente con origen (Pull & Push)', 'success')
      loadLocalRepoData(localFolderPath, activeBranch)
    } catch (err) {
      showToast(`Error de sincronización: ${err.message}`, 'error')
    } finally {
      setSyncLoading(false)
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

  const handleCreateBranch = async () => {
    const trimmed = newBranchName.trim().replace(/\s+/g, '-').toLowerCase()
    if (!trimmed) { setNewBranchError('El nombre no puede estar vacío'); return }
    if (localBranches.includes(trimmed)) { setNewBranchError('Ya existe una rama con ese nombre'); return }
    if (!/^[a-z0-9._/-]+$/.test(trimmed)) { setNewBranchError('Solo letras, números, guiones y puntos'); return }

    if (!localFolderPath) return
    
    setLoadingData(true)
    const result = await window.electronAPI.createBranch(localFolderPath, trimmed)
    if (result.success) {
      setShowNewBranchModal(false)
      setNewBranchName('')
      setNewBranchError('')
      loadLocalRepoData(localFolderPath, trimmed)
      showToast(`Rama "${trimmed}" creada y activada`, 'success')
    } else {
      setNewBranchError(`Error de Git: ${result.error}`)
      setLoadingData(false)
    }
  }

  const handleDeleteBranch = async () => {
    if (!branchToDelete || !localFolderPath) return
    
    setLoadingData(true)
    try {
      const result = await window.electronAPI.deleteBranch(localFolderPath, branchToDelete, deleteRemoteBranch)
      if (result.success) {
        if (result.remoteError) {
          showToast(`Rama "${branchToDelete}" eliminada localmente, pero falló en GitHub: ${result.remoteError}`, 'error')
        } else {
          showToast(`Rama "${branchToDelete}" eliminada correctamente ${deleteRemoteBranch ? '(local y de GitHub)' : '(local)'}`, 'success')
        }
        setBranchToDelete(null)
        setDeleteRemoteBranch(false)
        loadLocalRepoData(localFolderPath, activeBranch)
      } else {
        showToast(`Error al eliminar la rama: ${result.error}`, 'error')
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error')
    } finally {
      setLoadingData(false)
    }
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

        {/* Local Folder Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectFolder}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-700/80 transition-all text-sm text-slate-200 font-medium"
            title={localFolderPath || "Abrir carpeta del proyecto local"}
          >
            <Folder size={14} className="text-brand-400" />
            <span>{localFolderPath ? 'Abrir Otra Carpeta...' : 'Abrir Carpeta Local...'}</span>
          </button>
          
          <button
            onClick={handleCreateRepoClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-brand-500/50 hover:bg-brand-500/10 hover:text-brand-400 transition-all text-sm text-slate-300 font-medium cursor-pointer"
            title="Crear un nuevo repositorio en la nube"
          >
            <FolderPlus size={14} className="text-brand-400" />
            <span>Nuevo Repo...</span>
          </button>

          <button
            onClick={handleCloneRepoClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-sm text-slate-300 font-medium cursor-pointer"
            title="Clonar un repositorio remoto de tu cuenta"
          >
            <Download size={14} className="text-indigo-400" />
            <span>Clonar Repo...</span>
          </button>

          {localFolderPath && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs">
              <span className="font-semibold text-slate-200">{localFolderPath.split(/[/\\]/).pop()}</span>
              <span className="text-slate-500 font-mono hidden lg:inline max-w-sm truncate" title={localFolderPath}>
                {localFolderPath}
              </span>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-700/60 mx-1" />

        {/* Branch indicator */}
        {localFolderPath && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-sm">
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="font-mono text-xs text-slate-300 truncate max-w-32">{activeBranch}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Toast area */}
        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 z-50 w-auto min-w-64 max-w-sm">
            <ToastNotification message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
          </div>
        )}

        {localFolderPath && (
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-xl text-white font-semibold text-xs sm:text-sm transition-all shadow-lg bg-brand-500 hover:bg-brand-400 shadow-brand-500/20 disabled:opacity-60"
          >
            {syncLoading
              ? <RefreshCw size={15} className="animate-spin" />
              : <Upload size={15} />}
            <span>Sincronizar (Pull & Push)</span>
          </button>
        )}
        
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
              disabled={!localFolderPath}
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
                      <div
                        key={branch}
                        onClick={() => handleBranchSwitch(branch)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group relative overflow-hidden cursor-pointer ${
                          isActive
                            ? 'bg-slate-700/60 border border-slate-600/60'
                            : 'hover:bg-slate-800/60 border border-transparent'
                        }`}
                        role="button"
                      >
                        {isActive && (
                          <div className="absolute inset-0 rounded-xl opacity-10" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                        )}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: isActive ? color : '#334155' }} />
                        <span className={`text-sm font-mono truncate ${isActive ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {branch}
                        </span>
                        {isActive ? (
                          <CheckCircle2 size={13} className="ml-auto flex-shrink-0" style={{ color }} />
                        ) : (
                          branch !== 'main' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setBranchToDelete(branch)
                              }}
                              className="ml-auto p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 z-20"
                              title={`Eliminar rama ${branch}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* Remote Repositories */}
            <div>
              <div className="flex items-center gap-2 px-1 mb-2 mt-4">
                <GitMerge size={13} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Repositorios</span>
              </div>
              <button
                onClick={() => setShowCreateRepoModal(true)}
                disabled={!hasProviders}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400 transition-all text-sm font-semibold group disabled:opacity-40 disabled:cursor-not-allowed mb-2"
              >
                <Plus size={15} className="group-hover:rotate-90 transition-transform duration-200" />
                Crear Repositorio
              </button>

              <button
                onClick={handleCloneRepoClick}
                disabled={!hasProviders}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-brand-500/50 text-brand-400 hover:bg-brand-500/10 hover:border-brand-400 transition-all text-sm font-semibold group disabled:opacity-40 disabled:cursor-not-allowed mb-3"
              >
                <Download size={15} className="group-hover:translate-y-0.5 transition-transform duration-200" />
                Clonar Repositorio
              </button>
            </div>
            
            {localFolderPath && (
              <div>
                <div className="flex items-center gap-2 px-1 mb-2 mt-4">
                  <Code2 size={13} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Rama Remota</span>
                </div>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-800/60 border border-transparent transition-all group opacity-70 cursor-not-allowed">
                     <div className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                     <span className="text-sm font-mono text-slate-500 truncate">origin/{activeBranch}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER PANEL (50%) — Commit Graph ────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden border-r border-slate-700/50 relative">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/30 flex-shrink-0">
            {/* Tab Selector */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                    activeTab === 'history'
                      ? 'bg-slate-700 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers size={15} />
                  Historial
                </button>
                <button
                  onClick={() => setActiveTab('merge')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                    activeTab === 'merge'
                      ? 'bg-slate-700 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GitMerge size={15} />
                  Fusión y Conflictos
                </button>
              </div>
              
              {activeTab === 'history' && (
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-mono">{activeCommits.length}</span>
              )}
            </div>
            
            {localFolderPath && activeTab === 'history' && (
              <button
                onClick={() => loadLocalRepoData(localFolderPath, activeBranch)}
                disabled={loadingData}
                className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700/40 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Actualizar historial"
              >
                <RefreshCw size={14} className={`transition-transform duration-500 ${loadingData ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
            {/* ── HISTORY TAB ──────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <>
                {!localFolderPath ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-brand-500/10">
                      <GitBranch size={40} className="text-white animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Bienvenido a MonGit</h2>
                    <p className="text-sm text-slate-400 max-w-md mb-8">
                      Un cliente Git de escritorio ultrarrápido y premium para gestionar tus repositorios locales con facilidad.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={handleSelectFolder}
                        className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold transition-all shadow-lg shadow-brand-500/20 text-sm flex items-center gap-2 justify-center"
                      >
                        <Folder size={16} />
                        Abrir Carpeta Local...
                      </button>
                      <button 
                        onClick={handleCloneRepoClick}
                        className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all text-sm flex items-center gap-2 justify-center"
                      >
                        <Download size={16} className="text-indigo-400" />
                        Clonar Repositorio...
                      </button>
                      <button 
                        onClick={() => setShowProviderSetup(true)}
                        className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all text-sm flex items-center gap-2 justify-center"
                      >
                        <UserPlus size={16} />
                        Conectar Cuenta Cloud...
                      </button>
                    </div>
                  </div>
                ) : activeCommits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
                    <Clock size={48} className="mb-4 opacity-50 text-brand-400" />
                    <p className="text-sm">No se encontraron commits en la rama "{activeBranch}".</p>
                    <p className="text-xs text-slate-600 mt-1">Prepara cambios y realiza tu primer commit en el panel derecho.</p>
                  </div>
                ) : null}
                
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
                              {commit.isMerge && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold tracking-wide bg-purple-500/15 border-purple-500/40 text-purple-400 flex items-center gap-1 animate-pulse-slow"
                                >
                                  <GitMerge size={10} />
                                  Merge
                                </span>
                              )}
                              {commit.tags?.map(tag => {
                                let bg = 'bg-brand-500/10 border-brand-500/30 text-brand-400';
                                if (tag === 'HEAD') {
                                  bg = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold';
                                } else if (tag.startsWith('tag:') || tag.startsWith('tag: ')) {
                                  bg = 'bg-amber-500/15 border-amber-500/40 text-amber-400';
                                } else if (tag.startsWith('origin/')) {
                                  bg = 'bg-rose-500/15 border-rose-500/40 text-rose-400';
                                } else {
                                  bg = 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400';
                                }
                                return (
                                  <span
                                    key={tag}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold tracking-wide ${bg}`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })}
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
              </>
            )}
            
            {/* ── MERGE TAB ──────────────────────────────────────────── */}
            {activeTab === 'merge' && (
              <div className="h-full">
                <MergePanel
                  folderPath={localFolderPath}
                  branches={localBranches}
                  activeBranch={activeBranch}
                  onMergeComplete={() => {
                    loadLocalRepoData(localFolderPath, activeBranch)
                  }}
                />
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL (30%) — Staging Area ─────────────────────────────── */}
        <aside className="w-96 flex-shrink-0 flex flex-col bg-[#090e1b] overflow-hidden p-3 border-l border-slate-700/50">
          <LocalRepoPanel 
            folderPath={localFolderPath} 
            refreshTrigger={refreshTrigger}
            onCommitSuccess={() => loadLocalRepoData(localFolderPath, activeBranch)}
          />
        </aside>
      </div>

      {/* ── STATUS BAR ──────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-slate-700/50 glass-light flex-shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Terminal size={12} className="text-brand-400" />
            <span>
              {localFolderPath ? `Carpeta abierta: ${localFolderPath}` : 'No hay carpeta abierta'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono">MonGit Desktop v1.0.0</span>
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

      {branchToDelete && (
        <Modal
          title="¿Eliminar rama?"
          subtitle={`Esta acción es irreversible.`}
          onClose={() => { setBranchToDelete(null); setDeleteRemoteBranch(false) }}
          onConfirm={handleDeleteBranch}
        >
          <div className="space-y-3 py-1 text-left">
            <p className="text-sm text-slate-300">
              ¿Estás seguro de que deseas eliminar la rama local <span className="font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded text-xs">{branchToDelete}</span>?
            </p>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Atención:</strong> Si esta rama tiene cambios o commits locales que no han sido fusionados con la rama principal (<code>main</code>), se perderán definitivamente.
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-all cursor-pointer">
              <input
                type="checkbox"
                id="delete-remote-chk"
                checked={deleteRemoteBranch}
                onChange={e => setDeleteRemoteBranch(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-900 cursor-pointer accent-brand-500"
              />
              <label htmlFor="delete-remote-chk" className="text-xs font-semibold text-slate-300 select-none cursor-pointer hover:text-white transition-colors flex-1">
                Eliminar también de GitHub (remoto)
              </label>
            </div>
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
          }}
        />
      )}

      {showCloneRepoModal && (
        <CloneRepoModal
          providers={providers}
          allRepos={allRepos}
          onClose={() => setShowCloneRepoModal(false)}
          onCloneSuccess={(clonedPath) => {
            setLocalFolderPath(clonedPath)
            setShowRepoDropdown(false)
            loadLocalRepoData(clonedPath)
            setActiveTab('history')
            showToast('✓ Repositorio clonado con éxito', 'success')
          }}
        />
      )}
    </div>
  )
}
