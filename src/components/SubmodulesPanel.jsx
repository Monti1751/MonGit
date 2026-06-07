import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GitMerge, Plus, RefreshCw, Trash2, AlertCircle,
  CheckCircle2, RotateCcw, ArrowDown, ChevronDown, X
} from 'lucide-react'

const STATUS_TIMEOUT_MS = 4000

export default function SubmodulesPanel({ folderPath }) {
  const { t } = useTranslation()
  const [submodules, setSubmodules] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [subPath, setSubPath] = useState('')
  const [adding, setAdding] = useState(false)
  const [status, setStatus] = useState(null)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
  }

  const load = async () => {
    if (!folderPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitGetSubmodules(folderPath)
      setSubmodules(result.submodules || [])
    } catch {
      setSubmodules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [folderPath])

  const handleAdd = async () => {
    if (!repoUrl.trim() || !subPath.trim()) return
    setAdding(true)
    try {
      const result = await window.electronAPI.gitAddSubmodule(folderPath, repoUrl.trim(), subPath.trim())
      if (result.success) {
        showStatus('success', t('submodules.addSuccess', { path: subPath }))
        setRepoUrl('')
        setSubPath('')
        setShowAdd(false)
        await load()
      } else {
        showStatus('error', result.error || t('submodules.errors.add'))
      }
    } catch {
      showStatus('error', t('submodules.errors.add'))
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (path) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitUpdateSubmodule(folderPath, path)
      if (result.success) showStatus('success', t('submodules.updateSuccess', { path }))
      else showStatus('error', result.error || t('submodules.errors.update'))
    } catch {
      showStatus('error', t('submodules.errors.update'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAll = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitUpdateSubmodule(folderPath, null)
      if (result.success) showStatus('success', t('submodules.updateAllSuccess'))
      else showStatus('error', result.error || t('submodules.errors.update'))
    } catch {
      showStatus('error', t('submodules.errors.update'))
    } finally {
      setLoading(false)
      await load()
    }
  }

  const handleRemove = async (path) => {
    if (!window.confirm(t('submodules.confirmRemove', { path }))) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitRemoveSubmodule(folderPath, path)
      if (result.success) {
        showStatus('success', t('submodules.removeSuccess', { path }))
        await load()
      } else {
        showStatus('error', result.error || t('submodules.errors.remove'))
      }
    } catch {
      showStatus('error', t('submodules.errors.remove'))
    } finally {
      setLoading(false)
    }
  }

  const statusColor = {
    ok: 'text-emerald-400',
    modified: 'text-amber-400',
    uninitialized: 'text-rose-400'
  }

  return (
    <div className="p-4 space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
        <GitMerge size={13} className="flex-shrink-0 mt-0.5 text-indigo-400" />
        <span>{t('submodules.info')}</span>
      </div>

      {/* Status message */}
      {status && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium ${
          status.type === 'error'
            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          {status.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          {status.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition-all"
        >
          <Plus size={12} /> {t('submodules.addBtn')}
        </button>
        {submodules.length > 0 && (
          <button
            onClick={handleUpdateAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
          >
            <RotateCcw size={12} /> {t('submodules.updateAllBtn')}
          </button>
        )}
        <button onClick={load} disabled={loading} className="ml-auto text-slate-500 hover:text-white transition-colors p-1">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Add submodule form */}
      {showAdd && (
        <div className="space-y-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300">{t('submodules.addTitle')}</p>
          <input
            type="text"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            placeholder={t('submodules.urlPlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-brand-500 transition-colors"
          />
          <input
            type="text"
            value={subPath}
            onChange={e => setSubPath(e.target.value)}
            placeholder={t('submodules.pathPlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-brand-500 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !repoUrl.trim() || !subPath.trim()}
              className="flex-1 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
            >
              {adding ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
              {t('submodules.addConfirmBtn')}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-all"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Submodule list */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          {t('submodules.listLabel', { count: submodules.length })}
        </p>
        {loading && submodules.length === 0 ? (
          <div className="flex justify-center py-6">
            <RefreshCw size={18} className="animate-spin text-slate-500" />
          </div>
        ) : submodules.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">{t('submodules.empty')}</p>
        ) : (
          <div className="space-y-2">
            {submodules.map(sub => (
              <div key={sub.path} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 group">
                <GitMerge size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{sub.name}</p>
                  <p className="text-xs font-mono text-slate-500 truncate">{sub.path}</p>
                  <p className={`text-[10px] mt-0.5 ${statusColor[sub.status] || 'text-slate-500'}`}>
                    {t(`submodules.status.${sub.status}`, sub.status)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleUpdate(sub.path)}
                    className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all text-[10px]"
                    title={t('submodules.updateBtn')}
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    onClick={() => handleRemove(sub.path)}
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                    title={t('submodules.removeBtn')}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
