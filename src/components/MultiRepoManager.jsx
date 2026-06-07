import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Layers, Plus, RefreshCw, Trash2, X, FolderOpen,
  GitBranch, AlertCircle, CheckCircle2, Upload, Download,
  ChevronDown, ChevronRight, FileCode, Loader2
} from 'lucide-react'

const WORKSPACE_KEY = 'mongit_multirepo_workspace'

function loadWorkspace() {
  try {
    return JSON.parse(localStorage.getItem(WORKSPACE_KEY)) || { name: 'Mi Workspace', repos: [] }
  } catch {
    return { name: 'Mi Workspace', repos: [] }
  }
}

function saveWorkspace(ws) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws))
}

export default function MultiRepoManager({ onClose }) {
  const { t } = useTranslation()
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const [selected, setSelected] = useState(new Set())
  const [repoStatus, setRepoStatus] = useState({}) // path -> { loading, result }
  const [syncing, setSyncing] = useState(false)
  const [globalMsg, setGlobalMsg] = useState(null)

  const showMsg = (msg, type = 'success') => {
    setGlobalMsg({ msg, type })
    setTimeout(() => setGlobalMsg(null), 3500)
  }

  // Refresh info for all repos
  const refreshAll = useCallback(async () => {
    const repos = workspace.repos
    if (!repos.length) return
    const status = {}
    await Promise.all(repos.map(async (repo) => {
      status[repo.path] = { loading: true }
      try {
        const info = await window.electronAPI.gitGetRepoInfo(repo.path)
        status[repo.path] = { loading: false, ...info }
      } catch {
        status[repo.path] = { loading: false, success: false }
      }
    }))
    setRepoStatus({ ...status })
  }, [workspace.repos])

  useEffect(() => { refreshAll() }, [workspace.repos.length])

  const handleAddRepo = async () => {
    const folderPath = await window.electronAPI.selectFolder()
    if (!folderPath) return
    if (workspace.repos.some(r => r.path === folderPath)) {
      showMsg(t('multiRepo.errors.alreadyAdded'), 'error')
      return
    }
    const info = await window.electronAPI.gitGetRepoInfo(folderPath)
    const newRepo = { path: folderPath, name: info.name || folderPath.split(/[/\\]/).pop() }
    const newWs = { ...workspace, repos: [...workspace.repos, newRepo] }
    setWorkspace(newWs)
    saveWorkspace(newWs)
    showMsg(t('multiRepo.added', { name: newRepo.name }))
  }

  const handleRemoveRepo = (path) => {
    const newWs = { ...workspace, repos: workspace.repos.filter(r => r.path !== path) }
    setWorkspace(newWs)
    saveWorkspace(newWs)
    const newSel = new Set(selected)
    newSel.delete(path)
    setSelected(newSel)
  }

  const toggleSelect = (path) => {
    const newSel = new Set(selected)
    if (newSel.has(path)) newSel.delete(path)
    else newSel.add(path)
    setSelected(newSel)
  }

  const toggleAll = () => {
    if (selected.size === workspace.repos.length) setSelected(new Set())
    else setSelected(new Set(workspace.repos.map(r => r.path)))
  }

  const handleBulkSync = async () => {
    const targetRepos = workspace.repos.filter(r => selected.has(r.path))
    if (!targetRepos.length) return
    setSyncing(true)
    let ok = 0, fail = 0
    for (const repo of targetRepos) {
      setRepoStatus(prev => ({ ...prev, [repo.path]: { ...prev[repo.path], syncing: true } }))
      try {
        await window.electronAPI.gitPullRepo(repo.path)
        await window.electronAPI.gitPushRepo(repo.path)
        ok++
        setRepoStatus(prev => ({ ...prev, [repo.path]: { ...prev[repo.path], syncing: false, syncOk: true } }))
      } catch {
        fail++
        setRepoStatus(prev => ({ ...prev, [repo.path]: { ...prev[repo.path], syncing: false, syncOk: false } }))
      }
    }
    setSyncing(false)
    if (fail === 0) showMsg(t('multiRepo.syncSuccess', { count: ok }))
    else showMsg(t('multiRepo.syncPartial', { ok, fail }), 'error')
    await refreshAll()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Layers size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">{t('multiRepo.title')}</h2>
            <p className="text-xs text-slate-400">{t('multiRepo.subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/30 bg-slate-800/40">
          <button
            onClick={handleAddRepo}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={14} /> {t('multiRepo.addRepo')}
          </button>
          <button
            onClick={refreshAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-sm transition-all"
          >
            <RefreshCw size={13} /> {t('multiRepo.refresh')}
          </button>
          <div className="flex-1" />
          {workspace.repos.length > 0 && (
            <button
              onClick={handleBulkSync}
              disabled={selected.size === 0 || syncing}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t('multiRepo.syncSelected', { count: selected.size })}
            </button>
          )}
        </div>

        {/* Global message */}
        {globalMsg && (
          <div className={`mx-4 mt-3 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
            globalMsg.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {globalMsg.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {globalMsg.msg}
          </div>
        )}

        {/* Repo list */}
        <div className="flex-1 overflow-y-auto p-4">
          {workspace.repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Layers size={48} className="opacity-30" />
              <p className="text-sm font-medium">{t('multiRepo.empty')}</p>
              <p className="text-xs text-slate-600">{t('multiRepo.emptyHint')}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={toggleAll} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  {selected.size === workspace.repos.length ? t('multiRepo.deselectAll') : t('multiRepo.selectAll')}
                </button>
                <span className="text-xs text-slate-600">
                  {t('multiRepo.repoCount', { count: workspace.repos.length })}
                </span>
              </div>
              <div className="space-y-2">
                {workspace.repos.map(repo => {
                  const st = repoStatus[repo.path] || {}
                  const isSelected = selected.has(repo.path)
                  return (
                    <div
                      key={repo.path}
                      onClick={() => toggleSelect(repo.path)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500/40'
                          : 'bg-slate-800/50 border-slate-700/40 hover:border-slate-600/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-brand-400 bg-brand-500' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>

                      {/* Repo icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-brand-500/20' : 'bg-slate-700/60'
                      }`}>
                        <FileCode size={16} className={isSelected ? 'text-brand-400' : 'text-slate-400'} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{repo.name}</p>
                        <p className="text-xs text-slate-500 font-mono truncate">{repo.path}</p>
                        {st.loading ? (
                          <p className="text-xs text-slate-600 mt-0.5">{t('multiRepo.loading')}</p>
                        ) : st.success !== false && (
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-brand-400 flex items-center gap-1">
                              <GitBranch size={9} /> {st.activeBranch}
                            </span>
                            {st.changedFiles > 0 && (
                              <span className="text-xs text-amber-400">{t('multiRepo.changedFiles', { count: st.changedFiles })}</span>
                            )}
                            {st.hasUnpushed && (
                              <span className="text-xs text-indigo-400 flex items-center gap-1">
                                <Upload size={9} /> {t('multiRepo.unpushed')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status & actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {st.syncing && <Loader2 size={14} className="text-brand-400 animate-spin" />}
                        {st.syncOk === true && !st.syncing && <CheckCircle2 size={14} className="text-emerald-400" />}
                        {st.syncOk === false && !st.syncing && <AlertCircle size={14} className="text-rose-400" />}
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveRepo(repo.path) }}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                          title={t('multiRepo.remove')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
