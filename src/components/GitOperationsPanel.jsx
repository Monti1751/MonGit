import React, { useState, useEffect } from 'react'
import {
  Archive, RotateCcw, GitCommit, Tag, Zap,
  Plus, Trash2, Check, RefreshCw, AlertCircle,
  ChevronDown, ChevronRight, ArrowRightLeft, X,
  CheckCircle2, Info, GitBranch
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION = { STASH: 'stash', CHERRYPICK: 'cherrypick', REVERT: 'revert', TAGS: 'tags' }

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-slate-700/40 ${
        active ? 'bg-brand-500/10 text-brand-300' : 'hover:bg-slate-800/60 text-slate-300'
      }`}
    >
      <Icon size={16} className={active ? 'text-brand-400' : 'text-slate-500'} />
      <span className="flex-1 text-sm font-semibold">{title}</span>
      {badge != null && badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold">{badge}</span>
      )}
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
  const [stashes, setStashes] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
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
    setTimeout(() => setStatus(null), 4000)
  }

  const handleCreate = async () => {
    if (!folderPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitStash(folderPath, stashMessage || 'WIP')
      if (result.success) {
        showStatus('success', `Stash saved: "${stashMessage || 'WIP'}"`)
        setStashMessage('')
        await load()
      } else {
        showStatus('error', result.error || 'Could not create stash.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  const handleApply = async (index, pop = false) => {
    setLoading(true)
    try {
      const result = pop
        ? await window.electronAPI.gitStashPop(folderPath, index)
        : await window.electronAPI.gitStashApply(folderPath, index)
      if (result.success) {
        showStatus('success', pop ? 'Stash applied and removed.' : 'Stash applied.')
        await load()
      } else {
        showStatus('error', result.error || 'Could not apply stash.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  const handleDrop = async (index) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitStashDrop(folderPath, index)
      if (result.success) {
        showStatus('success', 'Stash deleted.')
        await load()
      } else {
        showStatus('error', result.error || 'Could not delete stash.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      {/* Create stash */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Save current changes</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={stashMessage}
            onChange={e => setStashMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Stash description (optional)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={loading || !folderPath}
            className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1.5 transition-all"
          >
            <Archive size={14} /> Save
          </button>
        </div>
      </div>

      {/* Stash list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Saved stashes ({stashes.length})</p>
          <button onClick={load} className="text-slate-500 hover:text-white transition-colors"><RefreshCw size={13} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>
        ) : stashes.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">No stashes saved yet.</p>
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
                  <button onClick={() => handleApply(i, false)} title="Apply (keep stash)" className="px-2 py-1 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-[10px] font-bold transition-all">Apply</button>
                  <button onClick={() => handleApply(i, true)} title="Apply and remove" className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold transition-all">Pop</button>
                  <button onClick={() => handleDrop(i)} title="Delete stash" className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all">
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

// ─── Cherry-pick Section ──────────────────────────────────────────────────────

function CherryPickSection({ folderPath, commits, activeBranch, branches }) {
  const [selectedCommit, setSelectedCommit] = useState('')
  const [targetBranch, setTargetBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), 5000)
  }

  const handleCherryPick = async () => {
    if (!selectedCommit || !targetBranch || !folderPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.gitCherryPick(folderPath, selectedCommit, targetBranch)
      if (result.success) {
        showStatus('success', `Commit ${selectedCommit.slice(0, 7)} applied to "${targetBranch}" successfully.`)
        setSelectedCommit('')
      } else {
        showStatus('error', result.error || 'Could not apply cherry-pick.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  const otherBranches = branches.filter(b => b !== activeBranch)

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>Cherry-pick applies a specific commit from the current branch to another branch.</span>
      </div>

      {/* Commit selector */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Select commit to apply</p>
        <select
          value={selectedCommit}
          onChange={e => setSelectedCommit(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none appearance-none"
        >
          <option value="">Choose a commit...</option>
          {(commits || []).slice(0, 30).map(c => (
            <option key={c.id} value={c.id} className="bg-slate-900">
              {c.id.slice(0, 7)} — {(c.message || '').slice(0, 50)}
            </option>
          ))}
        </select>
      </div>

      {/* Target branch */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Destination branch</p>
        <select
          value={targetBranch}
          onChange={e => setTargetBranch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none appearance-none"
        >
          <option value="">Choose branch...</option>
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
        {loading ? <><RefreshCw size={14} className="animate-spin" /> Applying...</> : <><ArrowRightLeft size={14} /> Apply Cherry-pick</>}
      </button>
    </div>
  )
}

// ─── Revert Section ───────────────────────────────────────────────────────────

function RevertSection({ folderPath, commits }) {
  const [selectedCommit, setSelectedCommit] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), 5000)
  }

  const handleRevert = async () => {
    if (!selectedCommit || !folderPath) return
    setShowConfirm(false)
    setLoading(true)
    try {
      const result = await window.electronAPI.gitRevert(folderPath, selectedCommit)
      if (result.success) {
        showStatus('success', `Commit ${selectedCommit.slice(0, 7)} has been reverted. A new commit was created.`)
        setSelectedCommit('')
      } else {
        showStatus('error', result.error || 'Could not revert the commit.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  const selectedInfo = selectedCommit ? commits?.find(c => c.id === selectedCommit) : null

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>Revert creates a <strong>new commit</strong> that undoes a previous commit. It's safe — history is preserved.</span>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Select commit to undo</p>
        <select
          value={selectedCommit}
          onChange={e => { setSelectedCommit(e.target.value); setShowConfirm(false) }}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none appearance-none"
        >
          <option value="">Choose a commit...</option>
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
          <p className="text-slate-500">by {selectedInfo.author} · {selectedInfo.time}</p>
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!selectedCommit || loading}
          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw size={14} /> Revert this Commit
        </button>
      ) : (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-3">
          <p className="text-xs text-rose-300 font-semibold text-center">Are you sure? A new revert commit will be created.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all">Cancel</button>
            <button onClick={handleRevert} disabled={loading} className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Confirm Revert
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tags Section ─────────────────────────────────────────────────────────────

function TagsSection({ folderPath }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagMessage, setTagMessage] = useState('')
  const [status, setStatus] = useState(null)

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), 4000)
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
      const result = await window.electronAPI.gitCreateTag(folderPath, tagName.trim(), tagMessage.trim() || `Release ${tagName.trim()}`)
      if (result.success) {
        showStatus('success', `Tag "${tagName}" created.`)
        setTagName('')
        setTagMessage('')
        await load()
      } else {
        showStatus('error', result.error || 'Could not create tag.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async (name) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitDeleteTag(folderPath, name)
      if (result.success) {
        showStatus('success', `Tag "${name}" deleted.`)
        await load()
      } else {
        showStatus('error', result.error || 'Could not delete tag.')
      }
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  const handlePushTag = async (name) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitPushTag(folderPath, name)
      if (result.success) showStatus('success', `Tag "${name}" pushed to remote.`)
      else showStatus('error', result.error || 'Could not push tag.')
    } catch (e) { showStatus('error', e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      {status && <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      {/* Create tag */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Create new tag</p>
        <div className="space-y-2">
          <input
            type="text"
            value={tagName}
            onChange={e => setTagName(e.target.value)}
            placeholder="Tag name (e.g. v1.0.0)"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
          />
          <input
            type="text"
            value={tagMessage}
            onChange={e => setTagMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Tag message (optional)"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={!tagName.trim() || loading || !folderPath}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={14} /> Create Tag
          </button>
        </div>
      </div>

      {/* Tag list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Existing tags ({tags.length})</p>
          <button onClick={load} className="text-slate-500 hover:text-white transition-colors"><RefreshCw size={13} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>
        ) : tags.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">No tags yet. Create your first version tag!</p>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 group">
                <Tag size={13} className="text-emerald-400 flex-shrink-0" />
                <span className="flex-1 font-mono text-sm text-slate-200">{tag}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePushTag(tag)} title="Push to remote" className="px-2 py-1 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-[10px] font-bold transition-all">Push</button>
                  <button onClick={() => handleDelete(tag)} title="Delete tag" className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all">
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

export default function GitOperationsPanel({ folderPath, commits, activeBranch, branches }) {
  const [activeSection, setActiveSection] = useState(SECTION.STASH)

  const toggle = (section) => setActiveSection(prev => prev === section ? null : section)

  if (!window.electronAPI) return null

  return (
    <div className="flex flex-col h-full bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/80 flex items-center gap-2">
        <Zap size={16} className="text-brand-400" />
        <h2 className="text-sm font-bold text-slate-200">Advanced Git Operations</h2>
      </div>

      {!folderPath ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center gap-3">
          <GitBranch size={40} className="opacity-40" />
          <p className="text-sm">Open a repository to use advanced operations.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Stash */}
          <SectionHeader icon={Archive} title="Stash — Save temporary changes" active={activeSection === SECTION.STASH} onClick={() => toggle(SECTION.STASH)} />
          {activeSection === SECTION.STASH && <StashSection folderPath={folderPath} />}

          {/* Cherry-pick */}
          <SectionHeader icon={ArrowRightLeft} title="Cherry-pick — Apply a commit to another branch" active={activeSection === SECTION.CHERRYPICK} onClick={() => toggle(SECTION.CHERRYPICK)} />
          {activeSection === SECTION.CHERRYPICK && <CherryPickSection folderPath={folderPath} commits={commits} activeBranch={activeBranch} branches={branches} />}

          {/* Revert */}
          <SectionHeader icon={RotateCcw} title="Revert — Undo a previous commit" active={activeSection === SECTION.REVERT} onClick={() => toggle(SECTION.REVERT)} />
          {activeSection === SECTION.REVERT && <RevertSection folderPath={folderPath} commits={commits} />}

          {/* Tags */}
          <SectionHeader icon={Tag} title="Tags — Version labels" active={activeSection === SECTION.TAGS} onClick={() => toggle(SECTION.TAGS)} />
          {activeSection === SECTION.TAGS && <TagsSection folderPath={folderPath} />}
        </div>
      )}
    </div>
  )
}
