import React, { useState, useEffect } from 'react'
import { Folder, RefreshCw, Check, CheckSquare, Square, UploadCloud, AlertCircle, ChevronDown, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── Constants ────────────────────────────────────────────────────────────────
const SUCCESS_DISPLAY_MS = 3000

const COMMIT_TEMPLATES = [
  { key: 'conventional', label: 'Conventional', preview: 'type(scope): subject\n\nbody here' },
  { key: 'semantic',     label: 'Semantic',     preview: '[type] Subject\n\nDescription' },
  { key: 'angular',      label: 'Angular',       preview: 'type(scope): description\n\nBREAKING CHANGE: ...' },
  { key: 'fix',          label: 'Bug Fix',       preview: 'fix: resolve issue with X\n\n- Root cause\n- Solution applied' },
  { key: 'feat',         label: 'Feature',       preview: 'feat: add new feature X\n\n- What it does\n- How to use it' },
]

export default function LocalRepoPanel({ folderPath, refreshTrigger, onRefreshDone, onCommitSuccess }) {
  const { t } = useTranslation()
  const [files, setFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [hasUnpushed, setHasUnpushed] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const isElectron = !!window.electronAPI

  const loadStatus = async (path) => {
    if (!isElectron) return
    setLoading(true)
    setError(null)
    try {
      const status = await window.electronAPI.getGitStatus(path)
      if (status === null) {
        setError(t('localRepo.errors.loadStatus'))
        setFiles([])
      } else {
        setFiles(status)
        // Auto-select all by default when loaded
        setSelectedFiles(new Set(status.map(f => f.path)))
      }

      // Check for unpushed commits
      const unpushed = await window.electronAPI.checkUnpushedCommits(path)
      setHasUnpushed(unpushed)
    } catch (e) {
      setError(t('localRepo.errors.general'))
    } finally {
      setLoading(false)
      if (onRefreshDone) onRefreshDone()
    }
  }

  // Handle repository switches
  useEffect(() => {
    setError(null)
    setSuccess(null)
    if (folderPath) {
      loadStatus(folderPath)
    } else {
      setFiles([])
      setSelectedFiles(new Set())
    }
  }, [folderPath])

  // Handle refresh triggers (e.g. from parent component actions)
  useEffect(() => {
    if (folderPath && refreshTrigger > 0) {
      loadStatus(folderPath)
    }
  }, [refreshTrigger])

  const toggleFile = (path) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) newSelected.delete(path)
    else newSelected.add(path)
    setSelectedFiles(newSelected)
  }

  const toggleAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)))
    }
  }

  const triggerSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => {
      setSuccess(prev => prev === msg ? null : prev)
    }, SUCCESS_DISPLAY_MS)
  }

  const handleCommit = async () => {
    if (!message.trim() || selectedFiles.size === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.commitChanges(folderPath, Array.from(selectedFiles), message)
      if (result.success) {
        setMessage('')
        triggerSuccess(t('localRepo.messages.commitSuccess'))
        await loadStatus(folderPath)
        if (onCommitSuccess) onCommitSuccess()
      } else {
        setError(t('localRepo.errors.commitFailed'))
      }
    } catch (e) {
      setError(t('localRepo.errors.general'))
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.pushChanges(folderPath)
      if (result.success) {
        triggerSuccess(t('localRepo.messages.pushSuccess'))
        await loadStatus(folderPath)
        if (onCommitSuccess) onCommitSuccess()
      } else {
        setError(t('localRepo.errors.pushFailed'))
      }
    } catch (e) {
      setError(t('localRepo.errors.general'))
    } finally {
      setLoading(false)
    }
  }

  if (!isElectron) return null

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Folder size={16} className="text-brand-400" />
          {t('localRepo.title')}
        </h2>
      </div>

      {!folderPath ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
          <Folder size={48} className="mb-4 opacity-50" />
          <p className="text-sm">{t('localRepo.noFolder')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4">
            {error && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2"><AlertCircle size={14} className="flex-shrink-0" />{error}</div>}
            {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex gap-2"><Check size={14} className="flex-shrink-0" />{success}</div>}

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('localRepo.modifiedFiles', { count: files.length })}</h3>
              {files.length > 0 && (
                <button onClick={toggleAll} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  {selectedFiles.size === files.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  {t('localRepo.all')}
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-sm">
                {t('localRepo.noChanges')}
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((file, i) => (
                  <label key={i} className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded-lg cursor-pointer group transition-colors">
                    <button type="button" onClick={() => toggleFile(file.path)} className="text-slate-500 group-hover:text-brand-400">
                      {selectedFiles.has(file.path) ? <CheckSquare size={16} className="text-brand-400" /> : <Square size={16} />}
                    </button>
                    <span className={`text-xs font-mono w-5 text-center font-bold ${file.status.includes('M') ? 'text-amber-400' : file.status.includes('D') ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {file.status.trim()}
                    </span>
                    <span className="text-sm text-slate-300 truncate">{file.path}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
            {/* Template picker */}
            <div className="mb-2">
              <button
                onClick={() => setShowTemplates(s => !s)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-brand-400 transition-colors"
              >
                <FileText size={11} />
                {t('localRepo.templates.label')}
                <ChevronDown size={10} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              </button>
              {showTemplates && (
                <div className="mt-1.5 grid grid-cols-1 gap-1">
                  {COMMIT_TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.key}
                      onClick={() => { setMessage(tmpl.preview); setShowTemplates(false) }}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
                    >
                      <span className="text-[10px] font-bold text-brand-400 group-hover:text-brand-300">{tmpl.label}</span>
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">{tmpl.preview.split('\n')[0]}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('localRepo.commitPlaceholder')}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 mb-3 focus:ring-1 focus:ring-brand-500 outline-none resize-none overflow-y-auto"
              disabled={files.length === 0 || loading}
            />
            <div className="flex gap-2">
              <button 
                onClick={handleCommit}
                disabled={files.length === 0 || loading || !message.trim() || selectedFiles.size === 0}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> {t('localRepo.commitButton', { count: selectedFiles.size })}
              </button>
              <button 
                onClick={handlePush}
                disabled={loading || !hasUnpushed}
                className="px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                title={!hasUnpushed ? t('localRepo.noPushPending') : t('localRepo.pushTitle')}
              >
                <UploadCloud size={16} /> {t('localRepo.pushButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
