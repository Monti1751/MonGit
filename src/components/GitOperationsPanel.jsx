import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Archive, RotateCcw, Tag, Zap,
  Plus, Trash2, Check, RefreshCw, AlertCircle,
  ChevronDown, ChevronRight, ArrowRightLeft, X,
  CheckCircle2, Info, GitBranch, Layers, ArrowUp, ArrowDown, GitCommit
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION = { STASH: 'stash', REBASE: 'rebase', CHERRYPICK: 'cherrypick', REVERT: 'revert', TAGS: 'tags' }
const STATUS_TIMEOUT_MS = 4000

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-slate-700/40 ${
        active ? 'bg-brand-500/10 text-brand-300' : 'hover:bg-slate-800/60 text-slate-300'
      }`}
    >
      <Icon size={16} className={active ? 'text-brand-400' : 'text-slate-500'} />
      <span className="flex-1 text-sm font-semibold">{title}</span>
      {active ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />}
    </button>
  )
}

function StatusBanner({ type, message, onClose }) {
  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    info: 'bg-brand-500/10 border-brand-500/30 text-brand-400',
  }
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs mb-3 ${styles[type]}`}>
      {type === 'success' ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" /> :
       type === 'error' ? <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> :
       <Info size={13} className="flex-shrink-0 mt-0.5" />}
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="text-current opacity-60 hover:opacity-100"><X size={12} /></button>}
    </div>
  )
}

// ─── Stash Section ────────────────────────────────────────────────────────────

function StashSection({ folderPath }) {
  const { t } = useTranslation()
  const [stashes, setStashes] = useState([])
  const [loading, setLoading] = useState(false)
  const [stashMessage, setStashMessage] = useState('')
  const [status, setStatus] = useState(null)

  const load = async () => {
    if (!folderPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitStashList(folderPath)
      setStashes(result.stashes || [])
    } catch { setStashes([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [folderPath])

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
  }

  const handleCreate = async () => {
    if (!folderPath) return
    setLoading(true)
    try {
      const label = stashMessage || 'WIP'
      const result = await window.electronAPI.gitStash(folderPath, label)
      if (result.success) {
        showStatus('success', t('gitOps.stash.success', { message: label }))
        setStashMessage('')
        await load()
      } else {
        showStatus('error', result.error || t('gitOps.stash.errorCreate'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  const handleApply = async (index, pop = false) => {
    setLoading(true)
    try {
      const result = pop
        ? await window.electronAPI.gitStashPop(folderPath, index)
        : await window.electronAPI.gitStashApply(folderPath, index)
      if (result.success) {
        showStatus('success', pop ? t('gitOps.stash.popSuccess') : t('gitOps.stash.applySuccess'))
        await load()
      } else {
        showStatus('error', result.error || t('gitOps.stash.errorApply'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  const handleDrop = async (index) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitStashDrop(folderPath, index)
      if (result.success) {
        showStatus('success', t('gitOps.stash.dropSuccess'))
        await load()
      } else {
        showStatus('error', result.error || t('gitOps.stash.errorDrop'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('gitOps.stash.saveLabel')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={stashMessage}
            onChange={e => setStashMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={t('gitOps.stash.savePlaceholder')}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={loading || !folderPath}
            className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1.5 transition-all"
          >
            <Archive size={14} /> {t('gitOps.stash.saveButton')}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {t('gitOps.stash.listLabel', { count: stashes.length })}
          </p>
          <button onClick={load} title={t('gitOps.common.refresh')} className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>
        ) : stashes.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">{t('gitOps.stash.empty')}</p>
        ) : (
          <div className="space-y-2">
            {stashes.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 group">
                <Archive size={13} className="text-brand-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 truncate font-medium">{s.message}</p>
                  <p className="text-[10px] text-slate-500">{s.date}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleApply(i, false)} title={t('gitOps.stash.apply')} className="px-2 py-1 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-[10px] font-bold transition-all">{t('gitOps.stash.apply')}</button>
                  <button onClick={() => handleApply(i, true)} title={t('gitOps.stash.pop')} className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold transition-all">{t('gitOps.stash.pop')}</button>
                  <button onClick={() => handleDrop(i)} title={t('gitOps.common.delete')} className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all">
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

// ─── Rebase Section ───────────────────────────────────────────────────────────

function RebaseSection({ folderPath, commits, onRefresh }) {
  const { t } = useTranslation()
  const [numCommits, setNumCommits] = useState(3)
  const [rebaseCommits, setRebaseCommits] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!commits || commits.length === 0) {
      setRebaseCommits([])
      return
    }
    const sliced = commits.slice(0, Math.min(numCommits, commits.length))
    const mapped = sliced.map(c => ({
      id: c.id,
      author: c.author,
      message: c.message,
      action: 'pick'
    })).reverse()
    setRebaseCommits(mapped)
  }, [commits, numCommits])

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
  }

  const handleActionChange = (index, action) => {
    setRebaseCommits(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], action }
      return copy
    })
  }

  const handleMessageChange = (index, message) => {
    setRebaseCommits(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], message }
      return copy
    })
  }

  const moveCommit = (index, direction) => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === rebaseCommits.length - 1) return

    setRebaseCommits(prev => {
      const copy = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return copy
    })
  }

  const handleStartRebase = async () => {
    if (!folderPath || rebaseCommits.length === 0) return
    
    const oldestCommitId = rebaseCommits[0].id
    const oldestIndex = commits.findIndex(c => c.id === oldestCommitId)
    const baseCommit = (oldestIndex !== -1 && commits[oldestIndex + 1])
      ? commits[oldestIndex + 1].id
      : oldestCommitId + '^'

    setLoading(true)
    try {
      const result = await window.electronAPI.gitInteractiveRebase(folderPath, baseCommit, rebaseCommits)
      if (result.success) {
        showStatus('success', t('gitOps.rebase.success'))
        if (onRefresh) onRefresh()
      } else if (result.conflict) {
        showStatus('info', t('gitOps.rebase.conflictDetected'))
        if (onRefresh) onRefresh()
      } else {
        showStatus('error', result.error || t('gitOps.rebase.error'))
      }
    } catch (err) {
      showStatus('error', t('gitOps.common.error'))
    } finally {
      setLoading(false)
    }
  }

  const actions = [
    { value: 'pick', label: t('gitOps.rebase.actionPick'), color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { value: 'reword', label: t('gitOps.rebase.actionReword'), color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { value: 'squash', label: t('gitOps.rebase.actionSquash'), color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    { value: 'fixup', label: t('gitOps.rebase.actionFixup'), color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { value: 'drop', label: t('gitOps.rebase.actionDrop'), color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
  ]

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>{t('gitOps.rebase.info')}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {t('gitOps.rebase.selectCommits')}
        </span>
        <select
          value={numCommits}
          onChange={e => setNumCommits(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
        >
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <option key={n} value={n}>{t('gitOps.rebase.lastCommits', { count: n })}</option>
          ))}
        </select>
      </div>

      {rebaseCommits.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4">{t('gitOps.rebase.noCommits')}</p>
      ) : (
        <div className="space-y-3">
          <div className="text-[10px] text-slate-500 flex justify-between px-1">
            <span>{t('gitOps.rebase.oldest')}</span>
            <span>{t('gitOps.rebase.newest')}</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {rebaseCommits.map((c, idx) => {
              const currentAction = actions.find(a => a.value === c.action) || actions[0]
              return (
                <div key={c.id} className="flex flex-col gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitCommit size={13} className="text-brand-400 flex-shrink-0" />
                      <span className="font-mono text-[10px] text-brand-300 flex-shrink-0">{c.id.slice(0, 7)}</span>
                      <span className="text-xs text-slate-200 truncate font-medium">{c.message}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => moveCommit(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-700/50 hover:bg-slate-600 text-slate-400 disabled:opacity-20 transition-all"
                        title={t('gitOps.rebase.moveUp')}
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        onClick={() => moveCommit(idx, 'down')}
                        disabled={idx === rebaseCommits.length - 1}
                        className="p-1 rounded bg-slate-700/50 hover:bg-slate-600 text-slate-400 disabled:opacity-20 transition-all"
                        title={t('gitOps.rebase.moveDown')}
                      >
                        <ArrowDown size={11} />
                      </button>

                      <select
                        value={c.action}
                        onChange={e => handleActionChange(idx, e.target.value)}
                        className={`text-xs font-bold rounded-lg border px-2 py-0.5 bg-slate-900 cursor-pointer focus:outline-none ${currentAction.color}`}
                      >
                        {actions.map(act => (
                          <option key={act.value} value={act.value} className="bg-slate-900 text-slate-200">
                            {act.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(c.action === 'reword' || c.action === 'squash') && (
                    <div className="mt-1">
                      <input
                        type="text"
                        value={c.message}
                        onChange={e => handleMessageChange(idx, e.target.value)}
                        placeholder={t('gitOps.rebase.messagePlaceholder')}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={handleStartRebase}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all mt-2"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> {t('gitOps.rebase.processing')}</>
            ) : (
              <><Layers size={14} /> {t('gitOps.rebase.button')}</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Cherry-pick Section ──────────────────────────────────────────────────────

function CherryPickSection({ folderPath, commits, activeBranch, branches }) {
  const { t } = useTranslation()
  const [selectedCommit, setSelectedCommit] = useState('')
  const [targetBranch, setTargetBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
  }

  const handleCherryPick = async () => {
    if (!selectedCommit || !targetBranch || !folderPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitCherryPick(folderPath, selectedCommit, targetBranch)
      if (result.success) {
        showStatus('success', t('gitOps.cherrypick.success', { id: selectedCommit.slice(0, 7), branch: targetBranch }))
        setSelectedCommit('')
      } else {
        showStatus('error', result.error || t('gitOps.cherrypick.error'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  const otherBranches = branches.filter(b => b !== activeBranch)

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>{t('gitOps.cherrypick.info')}</span>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('gitOps.cherrypick.commitLabel')}</p>
        <select
          value={selectedCommit}
          onChange={e => setSelectedCommit(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none appearance-none"
        >
          <option value="">{t('gitOps.cherrypick.commitPlaceholder')}</option>
          {(commits || []).slice(0, 30).map(c => (
            <option key={c.id} value={c.id} className="bg-slate-900">
              {c.id.slice(0, 7)} — {(c.message || '').slice(0, 50)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('gitOps.cherrypick.branchLabel')}</p>
        <select
          value={targetBranch}
          onChange={e => setTargetBranch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none appearance-none"
        >
          <option value="">{t('gitOps.cherrypick.branchPlaceholder')}</option>
          {otherBranches.map(b => (
            <option key={b} value={b} className="bg-slate-900">{b}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCherryPick}
        disabled={!selectedCommit || !targetBranch || loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
      >
        {loading
          ? <><RefreshCw size={14} className="animate-spin" /> {t('gitOps.cherrypick.applying')}</>
          : <><ArrowRightLeft size={14} /> {t('gitOps.cherrypick.button')}</>
        }
      </button>
    </div>
  )
}

// ─── Revert Section ───────────────────────────────────────────────────────────

function RevertSection({ folderPath, commits }) {
  const { t } = useTranslation()
  const [selectedCommit, setSelectedCommit] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
  }

  const handleRevert = async () => {
    if (!selectedCommit || !folderPath) return
    setShowConfirm(false)
    setLoading(true)
    try {
      const result = await window.electronAPI.gitRevert(folderPath, selectedCommit)
      if (result.success) {
        showStatus('success', t('gitOps.revert.success', { id: selectedCommit.slice(0, 7) }))
        setSelectedCommit('')
      } else {
        showStatus('error', result.error || t('gitOps.revert.error'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  const selectedInfo = selectedCommit ? commits?.find(c => c.id === selectedCommit) : null

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>{t('gitOps.revert.info')}</span>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('gitOps.revert.commitLabel')}</p>
        <select
          value={selectedCommit}
          onChange={e => { setSelectedCommit(e.target.value); setShowConfirm(false) }}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none appearance-none"
        >
          <option value="">{t('gitOps.revert.commitPlaceholder')}</option>
          {(commits || []).slice(0, 30).map(c => (
            <option key={c.id} value={c.id} className="bg-slate-900">
              {c.id.slice(0, 7)} — {(c.message || '').slice(0, 50)}
            </option>
          ))}
        </select>
      </div>

      {selectedInfo && (
        <div className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs space-y-1">
          <p className="text-slate-400">Commit: <span className="font-mono text-amber-400">{selectedInfo.id.slice(0, 12)}</span></p>
          <p className="text-slate-300 font-medium">{selectedInfo.message}</p>
          <p className="text-slate-500">{selectedInfo.author} · {selectedInfo.time}</p>
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!selectedCommit || loading}
          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw size={14} /> {t('gitOps.revert.button')}
        </button>
      ) : (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-3">
          <p className="text-xs text-rose-300 font-semibold text-center">{t('gitOps.revert.confirmMessage')}</p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all">
              {t('gitOps.revert.cancel')}
            </button>
            <button onClick={handleRevert} disabled={loading} className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} {t('gitOps.revert.confirmButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tags Section ─────────────────────────────────────────────────────────────

function TagsSection({ folderPath }) {
  const { t } = useTranslation()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagMessage, setTagMessage] = useState('')
  const [status, setStatus] = useState(null)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS)
  }

  const load = async () => {
    if (!folderPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitListTags(folderPath)
      setTags(result.tags || [])
    } catch { setTags([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [folderPath])

  const handleCreate = async () => {
    if (!tagName.trim() || !folderPath) return
    setLoading(true)
    try {
      const name = tagName.trim()
      const msg = tagMessage.trim() || `Release ${name}`
      const result = await window.electronAPI.gitCreateTag(folderPath, name, msg)
      if (result.success) {
        showStatus('success', t('gitOps.tags.createSuccess', { name }))
        setTagName('')
        setTagMessage('')
        await load()
      } else {
        showStatus('error', result.error || t('gitOps.tags.errorCreate'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  const handleDelete = async (name) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitDeleteTag(folderPath, name)
      if (result.success) {
        showStatus('success', t('gitOps.tags.deleteSuccess', { name }))
        await load()
      } else {
        showStatus('error', result.error || t('gitOps.tags.errorDelete'))
      }
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  const handlePushTag = async (name) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitPushTag(folderPath, name)
      if (result.success) showStatus('success', t('gitOps.tags.pushSuccess', { name }))
      else showStatus('error', result.error || t('gitOps.tags.errorPush'))
    } catch { showStatus('error', t('gitOps.common.error')) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('gitOps.tags.createLabel')}</p>
        <div className="space-y-2">
          <input
            type="text"
            value={tagName}
            onChange={e => setTagName(e.target.value)}
            placeholder={t('gitOps.tags.namePlaceholder')}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
          />
          <input
            type="text"
            value={tagMessage}
            onChange={e => setTagMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={t('gitOps.tags.messagePlaceholder')}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={!tagName.trim() || loading || !folderPath}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={14} /> {t('gitOps.tags.createButton')}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {t('gitOps.tags.listLabel', { count: tags.length })}
          </p>
          <button onClick={load} title={t('gitOps.common.refresh')} className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>
        ) : tags.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">{t('gitOps.tags.empty')}</p>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 group">
                <Tag size={13} className="text-emerald-400 flex-shrink-0" />
                <span className="flex-1 font-mono text-sm text-slate-200">{tag}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePushTag(tag)} title={t('gitOps.tags.push')} className="px-2 py-1 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-[10px] font-bold transition-all">
                    {t('gitOps.tags.push')}
                  </button>
                  <button onClick={() => handleDelete(tag)} title={t('gitOps.common.delete')} className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all">
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

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function GitOperationsPanel({ folderPath, commits, activeBranch, branches, onRefresh }) {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState(SECTION.STASH)

  const toggle = (section) => setActiveSection(prev => prev === section ? null : section)

  if (!window.electronAPI) return null

  return (
    <div className="flex flex-col h-full bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/80 flex items-center gap-2">
        <Zap size={16} className="text-brand-400" />
        <h2 className="text-sm font-bold text-slate-200">{t('gitOps.title')}</h2>
      </div>

      {!folderPath ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center gap-3">
          <GitBranch size={40} className="opacity-40" />
          <p className="text-sm">{t('gitOps.noFolder')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <SectionHeader icon={Archive} title={t('gitOps.stash.title')} active={activeSection === SECTION.STASH} onClick={() => toggle(SECTION.STASH)} />
          {activeSection === SECTION.STASH && <StashSection folderPath={folderPath} />}

          <SectionHeader icon={Layers} title={t('gitOps.rebase.title')} active={activeSection === SECTION.REBASE} onClick={() => toggle(SECTION.REBASE)} />
          {activeSection === SECTION.REBASE && <RebaseSection folderPath={folderPath} commits={commits} onRefresh={onRefresh} />}

          <SectionHeader icon={ArrowRightLeft} title={t('gitOps.cherrypick.title')} active={activeSection === SECTION.CHERRYPICK} onClick={() => toggle(SECTION.CHERRYPICK)} />
          {activeSection === SECTION.CHERRYPICK && <CherryPickSection folderPath={folderPath} commits={commits} activeBranch={activeBranch} branches={branches} />}

          <SectionHeader icon={RotateCcw} title={t('gitOps.revert.title')} active={activeSection === SECTION.REVERT} onClick={() => toggle(SECTION.REVERT)} />
          {activeSection === SECTION.REVERT && <RevertSection folderPath={folderPath} commits={commits} />}

          <SectionHeader icon={Tag} title={t('gitOps.tags.title')} active={activeSection === SECTION.TAGS} onClick={() => toggle(SECTION.TAGS)} />
          {activeSection === SECTION.TAGS && <TagsSection folderPath={folderPath} />}
        </div>
      )}
    </div>
  )
}
