import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GitBranch, GitCommit, ArrowRight, RefreshCw,
  ChevronDown, X, AlertCircle, CheckCircle2, ArrowRightLeft
} from 'lucide-react'

const STATUS_TIMEOUT_MS = 4000

export default function AdvancedDiff({ folderPath, commits = [], branches = [] }) {
  const { t } = useTranslation()
  const [comparisonType, setComparisonType] = useState('branches')
  const [sourceA, setSourceA] = useState('')
  const [sourceB, setSourceB] = useState('')
  const [diff, setDiff] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDiff(null)
    setSourceA('')
    setSourceB('')
    setError(null)
  }, [comparisonType])

  const handleCompare = async () => {
    if (!sourceA.trim() || !sourceB.trim() || !folderPath) return
    setLoading(true)
    setError(null)
    setDiff(null)
    try {
      let result
      if (comparisonType === 'branches') {
        result = await window.electronAPI.gitDiffBranches(folderPath, sourceA, sourceB)
      } else {
        result = await window.electronAPI.gitDiffCommits(folderPath, sourceA, sourceB)
      }
      if (result.success) {
        setDiff(result.diff || '')
      } else {
        setError(result.error || t('advancedDiff.errors.generic'))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const types = [
    { id: 'branches', label: t('advancedDiff.types.branches'), icon: GitBranch },
    { id: 'commits', label: t('advancedDiff.types.commits'), icon: GitCommit },
  ]

  const parseStats = (diffText) => {
    let additions = 0, deletions = 0, files = 0
    if (!diffText) return { additions, deletions, files }
    diffText.split('\n').forEach(line => {
      if (line.startsWith('diff --git')) files++
      else if (line.startsWith('+') && !line.startsWith('+++')) additions++
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++
    })
    return { additions, deletions, files }
  }

  const stats = diff !== null ? parseStats(diff) : null

  return (
    <div className="p-4 space-y-4">
      {/* Info */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-700/30 border border-slate-700/30 text-slate-400 text-xs">
        <ArrowRightLeft size={13} className="flex-shrink-0 mt-0.5 text-brand-400" />
        <span>{t('advancedDiff.info')}</span>
      </div>

      {/* Type selector */}
      <div className="flex gap-1.5 p-1 bg-slate-800/60 rounded-xl">
        {types.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setComparisonType(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              comparisonType === id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Source selectors */}
      <div className="flex items-center gap-2">
        {comparisonType === 'branches' ? (
          <>
            <select
              value={sourceA}
              onChange={e => setSourceA(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{t('advancedDiff.selectA')}</option>
              {branches.map(b => (
                <option key={b} value={b} className="bg-slate-900">{b}</option>
              ))}
            </select>
            <ArrowRight size={16} className="text-slate-500 flex-shrink-0" />
            <select
              value={sourceB}
              onChange={e => setSourceB(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{t('advancedDiff.selectB')}</option>
              {branches.map(b => (
                <option key={b} value={b} className="bg-slate-900">{b}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <select
              value={sourceA}
              onChange={e => setSourceA(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{t('advancedDiff.selectCommitA')}</option>
              {commits.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">{c.id} — {c.message?.slice(0, 40)}</option>
              ))}
            </select>
            <ArrowRight size={16} className="text-slate-500 flex-shrink-0" />
            <select
              value={sourceB}
              onChange={e => setSourceB(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{t('advancedDiff.selectCommitB')}</option>
              {commits.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">{c.id} — {c.message?.slice(0, 40)}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Compare button */}
      <button
        onClick={handleCompare}
        disabled={!sourceA || !sourceB || loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <><RefreshCw size={15} className="animate-spin" /> {t('advancedDiff.comparing')}</>
        ) : (
          <><ArrowRightLeft size={15} /> {t('advancedDiff.compareBtn')}</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Diff result */}
      {diff !== null && (
        <div className="space-y-2">
          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs">
              <span className="text-slate-400">{t('advancedDiff.stats.files', { count: stats.files })}</span>
              <span className="text-emerald-400">+{stats.additions}</span>
              <span className="text-rose-400">-{stats.deletions}</span>
              {diff === '' && (
                <span className="text-slate-500 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" /> {t('advancedDiff.noDiff')}
                </span>
              )}
            </div>
          )}

          {/* Diff content */}
          {diff && (
            <div className="rounded-xl bg-slate-950 border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/80">
                <span className="text-xs font-semibold text-slate-400">{t('advancedDiff.diffOutput')}</span>
                <button
                  onClick={() => setDiff(null)}
                  className="p-1 rounded hover:bg-slate-700/60 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-3">
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-words leading-5">
                  {diff.split('\n').map((line, i) => (
                    <span key={i} className={`block ${
                      line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400 bg-emerald-950/30' :
                      line.startsWith('-') && !line.startsWith('---') ? 'text-rose-400 bg-rose-950/30' :
                      line.startsWith('@@') ? 'text-brand-400 bg-slate-800/60' :
                      line.startsWith('diff') ? 'text-indigo-400 font-semibold' :
                      'text-slate-400'
                    }`}>{line || ' '}</span>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
