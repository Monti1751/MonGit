import React, { useState, useEffect } from 'react'
import { GitPullRequest, GitMerge, Plus, RefreshCw, AlertCircle, Calendar, User, ArrowRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchBranches } from '../providers/index.js'
import PRDetailsPanel from './PRDetailsPanel'

export default function PRPanel({
  folderPath,
  providers,
  allRepos,
  getPullRequests,
  createPR,
  mergePR,
  getPRComments,
  createPRComment,
  getPRCheckRuns,
  getPRFiles,
  showToast
}) {
  const { t } = useTranslation()
  const [remoteUrl, setRemoteUrl] = useState('')
  const [matchingRepo, setMatchingRepo] = useState(null)
  const [prs, setPRs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('open') // open, closed, all
  const [selectedPR, setSelectedPR] = useState(null)
  
  // Create PR modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  const [prDescription, setPrDescription] = useState('')
  const [sourceBranch, setSourceBranch] = useState('')
  const [targetBranch, setTargetBranch] = useState('')
  const [repoBranches, setRepoBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (folderPath) {
      detectRepo()
    }
  }, [folderPath, allRepos])

  useEffect(() => {
    if (matchingRepo) {
      loadPRs()
    }
  }, [matchingRepo, filter])

  const detectRepo = async () => {
    try {
      const res = await window.electronAPI.getRemoteUrl(folderPath)
      if (res.success && res.url) {
        setRemoteUrl(res.url)
        // Extract owner and name from remote URL (SSH or HTTPS)
        // e.g. https://github.com/owner/repo.git or git@github.com:owner/repo.git
        const cleaned = res.url.replace(/\.git$/, '')
        let fullName = ''
        
        if (cleaned.includes('github.com')) {
          fullName = cleaned.split('github.com/').pop()?.split('github.com:').pop() || ''
        } else if (cleaned.includes('gitlab.com')) {
          fullName = cleaned.split('gitlab.com/').pop()?.split('gitlab.com:').pop() || ''
        }
        
        if (fullName) {
          const match = allRepos.find(r => r.fullName.toLowerCase() === fullName.toLowerCase())
          if (match) {
            setMatchingRepo(match)
            return
          }
        }
      }
      setMatchingRepo(null)
      setPRs([])
    } catch (e) {
      console.error('Error detecting repo:', e)
    }
  }

  const loadPRs = async () => {
    if (!matchingRepo) return
    setLoading(true)
    try {
      const data = await getPullRequests(matchingRepo, filter)
      setPRs(data)
    } catch (e) {
      console.error('Error loading PRs:', e)
      showToast(t('pr.panel.errorLoading', 'No se pudieron cargar los Pull Requests.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreateModal = async () => {
    if (!matchingRepo) return
    setShowCreateModal(true)
    setPrTitle('')
    setPrDescription('')
    
    // Get current branch
    try {
      const status = await window.electronAPI.getGitStatus(folderPath)
      setSourceBranch(status.branch || '')
    } catch (e) {
      console.error(e)
    }

    // Load branches for target selection
    setLoadingBranches(true)
    try {
      const provider = providers.find(p => p.id === matchingRepo.providerAccountId)
      if (provider) {
        const branches = await fetchBranches(
          provider.providerId,
          provider.creds,
          matchingRepo.owner,
          matchingRepo.name,
          matchingRepo._meta || {}
        )
        setRepoBranches(branches)

        // Find default branch
        const defaultTarget = branches.find(b => b.name === matchingRepo.defaultBranch || b.name === 'main' || b.name === 'master')
        setTargetBranch(defaultTarget?.name || branches[0]?.name || 'main')
      }
    } catch (e) {
      console.error('Error fetching target branches:', e)
    } finally {
      setLoadingBranches(false)
    }
  }

  const handleCreate = async () => {
    if (!prTitle.trim() || !sourceBranch || !targetBranch) return
    setCreating(true)
    try {
      await createPR(matchingRepo, {
        title: prTitle,
        description: prDescription,
        sourceBranch,
        targetBranch
      })
      showToast(t('pr.panel.successCreated', 'Pull Request creado correctamente.'), 'success')
      setShowCreateModal(false)
      loadPRs()
    } catch (e) {
      showToast(e.message || t('pr.panel.errorCreating', 'Error al crear el Pull Request.'), 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleMerge = async (prNumber) => {
    if (!matchingRepo) return
    if (!window.confirm(t('pr.panel.confirmMerge', '¿Estás seguro de que quieres fusionar este Pull Request?'))) return
    
    try {
      await mergePR(matchingRepo, prNumber)
      showToast(t('pr.panel.successMerged', 'Pull Request fusionado correctamente.'), 'success')
      setSelectedPR(null)
      loadPRs()
    } catch (e) {
      showToast(e.message || t('pr.panel.errorMerging', 'Error al fusionar el Pull Request.'), 'error')
    }
  }

  if (!folderPath) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <GitPullRequest size={48} className="mb-4 text-slate-600" />
        <p className="text-sm font-medium">{t('app.status.noFolder', 'No hay ninguna carpeta abierta.')}</p>
      </div>
    )
  }

  if (!matchingRepo) {
    return (
      <div className="p-8 max-w-xl mx-auto flex flex-col items-center text-center justify-center min-h-[40vh] animate-fadeIn">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-base font-bold text-white mb-2">
          {t('pr.panel.noLinkedTitle', 'Repositorio no vinculado a cuenta cloud')}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {t('pr.panel.noLinkedDesc', 'Para gestionar Pull Requests, debes añadir tu cuenta (GitHub/GitLab) en el panel de Proveedores y clonar o abrir un repositorio que coincida con tus repositorios remotos.')}
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-500">
          <span className="text-left font-bold text-slate-400 mb-1">{t('pr.panel.detailsUrl', 'Detalles detectados:')}</span>
          <span className="truncate" title={remoteUrl}>URL: {remoteUrl || 'N/A'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col h-full space-y-4 animate-fadeIn">
      {/* Top Filter and Actions */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-850">
          {[
            { key: 'open', label: t('pr.panel.filterOpen', '🟢 Abiertos') },
            { key: 'closed', label: t('pr.panel.filterClosed', '🟣 Cerrados') },
            { key: 'all', label: t('pr.panel.filterAll', 'Todos') }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPRs}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title={t('pr.panel.refresh', 'Actualizar')}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1 transition shadow-lg shadow-brand-500/10 glow-teal-sm"
          >
            <Plus size={14} />
            {t('pr.panel.createBtn', 'Crear PR')}
          </button>
        </div>
      </div>

      {/* PR Cards list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[60vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-brand-400 mb-2" />
            <p className="text-xs">{t('pr.panel.loading', 'Buscando Pull Requests...')}</p>
          </div>
        ) : prs.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-slate-500">
            <GitPullRequest size={32} className="mx-auto mb-2 text-slate-650" />
            <p className="text-xs font-medium">{t('pr.panel.noResults', 'No se encontraron Pull Requests.')}</p>
          </div>
        ) : (
          prs.map(pr => (
            <div
              key={pr.id}
              onClick={() => setSelectedPR(pr)}
              className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-700/80 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-slate-800/10 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-mono">#{pr.number}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <User size={10} />
                    {pr.user}
                  </span>
                  <span className="text-[9px] text-slate-600 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(pr.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition truncate">{pr.title}</h4>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-500">
                  <span className="text-slate-400">{pr.source}</span>
                  <ArrowRight size={10} />
                  <span>{pr.target}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {pr.state === 'open' ? (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {t('pr.panel.stateOpen', 'Abierto')}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-purple-400 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    {t('pr.panel.stateClosed', 'Fusionado')}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedPR(pr)
                  }}
                  className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-500 transition"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PR Details modal */}
      {selectedPR && (
        <PRDetailsPanel
          pr={selectedPR}
          repo={matchingRepo}
          onClose={() => setSelectedPR(null)}
          onMerge={handleMerge}
          getPRComments={getPRComments}
          createPRComment={createPRComment}
          getPRCheckRuns={getPRCheckRuns}
          getPRFiles={getPRFiles}
        />
      )}

      {/* Create PR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <GitPullRequest size={16} className="text-brand-400" />
                {t('pr.create.title', 'Crear nuevo Pull Request')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Branch comparison */}
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-2">
                <div className="flex-1 flex flex-col">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('pr.create.source', 'Origen (Local)')}</span>
                  <span className="text-xs font-mono text-brand-400 mt-0.5 truncate">{sourceBranch}</span>
                </div>
                <ArrowRight size={14} className="text-slate-600 mt-2" />
                <div className="flex-1 flex flex-col">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('pr.create.target', 'Destino (Remoto)')}</span>
                  {loadingBranches ? (
                    <span className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" /> {t('pr.create.loading', 'Cargando...')}
                    </span>
                  ) : (
                    <select
                      value={targetBranch}
                      onChange={e => setTargetBranch(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 mt-0.5 cursor-pointer font-mono"
                    >
                      {repoBranches.map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Inputs */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">{t('pr.create.prTitle', 'Título del Pull Request')}</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={e => setPrTitle(e.target.value)}
                  placeholder={t('pr.create.titlePlaceholder', 'ej: feat: añadido nuevo botón de guardar')}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">{t('pr.create.prDesc', 'Descripción')}</label>
                <textarea
                  rows={4}
                  value={prDescription}
                  onChange={e => setPrDescription(e.target.value)}
                  placeholder={t('pr.create.descPlaceholder', 'Detalla los cambios introducidos por este PR...')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-brand-500 resize-none font-sans"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-800 pt-4 flex gap-3 justify-end mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-semibold"
              >
                {t('app.buttons.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !prTitle.trim() || loadingBranches}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg disabled:opacity-50 disabled:pointer-events-none glow-teal-sm"
              >
                {creating ? <RefreshCw size={13} className="animate-spin" /> : <GitMerge size={13} />}
                {t('pr.create.submitBtn', 'Crear Pull Request')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
