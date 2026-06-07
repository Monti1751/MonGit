import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GitMerge, GitBranch, AlertTriangle, Check, X,
  ChevronRight, FileWarning, RefreshCw, ArrowRight,
  CheckCircle2, XCircle, Layers, ArrowDown, Zap, Ban,
  Info, ChevronDown, ChevronUp
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const MERGE_SUCCESS_DELAY_MS = 2500
const CONFLICT_CHECK_DELAY_MS = 500

// ─── Conflict Parser ─────────────────────────────────────────────────────────

function parseConflicts(content) {
  const lines = content.split('\n')
  const blocks = []
  let currentBlock = null
  let blockIndex = 0
  let linesBefore = [] // collect non-conflict lines before each block

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('<<<<<<<')) {
      currentBlock = {
        id: blockIndex++,
        startLine: i,
        ours: [],
        theirs: [],
        resolved: false,
        resolution: null,
        section: 'ours',
        marker: line,
        context: linesBefore.slice(-3), // 3 lines of context before
      }
      linesBefore = []
    } else if (currentBlock && line.startsWith('=======')) {
      currentBlock.section = 'theirs'
    } else if (currentBlock && line.startsWith('>>>>>>>')) {
      currentBlock.endLine = i
      currentBlock.theirMarker = line
      blocks.push(currentBlock)
      currentBlock = null
      linesBefore = []
    } else if (currentBlock) {
      if (currentBlock.section === 'ours') {
        currentBlock.ours.push(line)
      } else {
        currentBlock.theirs.push(line)
      }
    } else {
      linesBefore.push(line)
    }
  }

  return blocks
}

function reconstructFile(content, blocks) {
  const lines = content.split('\n')
  const output = []
  let currentBlockIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('<<<<<<<')) {
      const block = blocks[currentBlockIndex++]
      if (block && block.resolved) {
        if (block.resolution === 'ours') {
          output.push(...block.ours)
        } else if (block.resolution === 'theirs') {
          output.push(...block.theirs)
        } else if (block.resolution === 'both') {
          output.push(...block.ours)
          output.push(...block.theirs)
        }
      } else {
        // Leave conflict markers intact
        let j = i
        while (j < lines.length && !lines[j].startsWith('>>>>>>>')) {
          output.push(lines[j])
          j++
        }
        if (j < lines.length) {
          output.push(lines[j])
        }
        i = j
        continue
      }
      // Skip original block until end marker
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        i++
      }
    } else {
      output.push(line)
    }
  }

  return output.join('\n')
}

// ─── Code Viewer ─────────────────────────────────────────────────────────────

function CodeLines({ lines, colorClass, emptyLabel = '(empty)' }) {
  if (lines.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-slate-500 font-medium italic">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="font-mono text-xs overflow-x-auto py-1 bg-black/20">
      {lines.map((line, idx) => (
        <div key={idx} className="flex group hover:bg-black/10">
          <span className="select-none w-8 flex-shrink-0 text-right pr-2 py-px text-slate-600 group-hover:text-slate-500 border-r border-slate-700/50">
            {idx + 1}
          </span>
          <span className={`pl-2 py-px whitespace-pre-wrap break-all ${colorClass}`}>{line || ' '}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Conflict Block Card ───────────────────────────────────────────────────────

function ConflictBlock({ block, index, total, onResolve, fromBranch, activeBranch }) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const isResolved = block.resolved

  const resolutionLabel = {
    ours: t('merge.keptYours', { branch: activeBranch }),
    theirs: t('merge.keptIncoming', { branch: fromBranch || 'incoming' }),
    both: t('merge.keptBoth'),
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-300 shadow-lg ${
      isResolved
        ? 'border-emerald-500/30 bg-emerald-950/20'
        : 'border-amber-500/40 bg-slate-800/60'
    }`}>

      {/* ── Header ── */}
      <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold ${
        isResolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
      }`}>
        <span className="flex items-center gap-2">
          {isResolved
            ? <><CheckCircle2 size={13} /> {t('merge.conflictResolvedLabel', { current: index + 1, total, label: resolutionLabel[block.resolution] })}</>
            : <><AlertTriangle size={13} className="animate-pulse" /> {t('merge.conflictUnresolvedLabel', { current: index + 1, total })}</>
          }
        </span>
        <div className="flex items-center gap-2">
          {isResolved && (
            <button
              onClick={() => onResolve(block.id, null)}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors underline"
            >
              {t('merge.undo')}
            </button>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* ── Context hint ── */}
          {block.context && block.context.length > 0 && (
            <div className="bg-slate-900/40 border-b border-slate-700/30 px-3 py-1 font-mono text-[10px] text-slate-600 overflow-hidden">
              {block.context.map((l, i) => (
                <div key={i} className="truncate">{l || ' '}</div>
              ))}
              <div className="text-slate-500 text-[9px] mt-0.5">↑ {t('merge.codeBefore')}</div>
            </div>
          )}

          {/* ── Side by side diff ── */}
          <div className="grid grid-cols-2 divide-x divide-slate-700/60">
            {/* OURS */}
            <div className={`relative transition-all ${
              isResolved && block.resolution === 'theirs' ? 'opacity-30' : ''
            }`}>
              <div className={`px-3 py-2 border-b flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                isResolved && block.resolution === 'ours'
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-500/8 border-emerald-500/20 text-emerald-500'
              }`}>
                <GitBranch size={10} />
                <span className="truncate">{activeBranch} <span className="opacity-60 normal-case font-normal">({t('merge.yoursLabel')})</span></span>
                {isResolved && block.resolution === 'ours' && <Check size={10} className="ml-auto flex-shrink-0" />}
              </div>
              <div className="bg-emerald-950/20">
                <CodeLines
                  lines={block.ours}
                  colorClass="text-emerald-300/90"
                  emptyLabel={t('merge.emptySide')}
                />
              </div>
            </div>

            {/* THEIRS */}
            <div className={`relative transition-all ${
              isResolved && block.resolution === 'ours' ? 'opacity-30' : ''
            }`}>
              <div className={`px-3 py-2 border-b flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                isResolved && block.resolution === 'theirs'
                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                  : 'bg-indigo-500/8 border-indigo-500/20 text-indigo-500'
              }`}>
                <GitMerge size={10} />
                <span className="truncate">{fromBranch || 'incoming'} <span className="opacity-60 normal-case font-normal">({t('merge.incomingLabel')})</span></span>
                {isResolved && block.resolution === 'theirs' && <Check size={10} className="ml-auto flex-shrink-0" />}
              </div>
              <div className="bg-indigo-950/20">
                <CodeLines
                  lines={block.theirs}
                  colorClass="text-indigo-300/90"
                  emptyLabel={t('merge.emptySide')}
                />
              </div>
            </div>
          </div>

          {/* ── Resolution actions ── */}
          {!isResolved && (
            <div className="flex items-stretch gap-0 border-t border-slate-700/30 divide-x divide-slate-700/30">
              <button
                onClick={() => onResolve(block.id, 'ours')}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-emerald-500/8 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all text-xs font-semibold group"
              >
                <Check size={14} className="group-hover:scale-110 transition-transform" />
                <span>{t('merge.keepMine')}</span>
                <span className="text-[10px] font-normal text-emerald-600 truncate max-w-full px-2">{activeBranch}</span>
              </button>
              <button
                onClick={() => onResolve(block.id, 'theirs')}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-indigo-500/8 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all text-xs font-semibold group"
              >
                <Check size={14} className="group-hover:scale-110 transition-transform" />
                <span>{t('merge.keepIncoming')}</span>
                <span className="text-[10px] font-normal text-indigo-600 truncate max-w-full px-2">{fromBranch || 'incoming'}</span>
              </button>
              <button
                onClick={() => onResolve(block.id, 'both')}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-purple-500/8 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-all text-xs font-semibold group"
              >
                <Layers size={14} className="group-hover:scale-110 transition-transform" />
                <span>{t('merge.keepBoth')}</span>
                <span className="text-[10px] font-normal text-purple-600">{t('merge.concatenated')}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── No Conflicts Banner ───────────────────────────────────────────────────────

function NoConflictsBanner({ activeBranch, fromBranch }) {
  const { t } = useTranslation()
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
        <CheckCircle2 size={40} className="text-emerald-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-emerald-400 mb-1">{t('merge.noConflictsTitle')}</h3>
        <p className="text-sm text-slate-400 max-w-xs">
          {t('merge.noConflictsDesc', { from: fromBranch, to: activeBranch })}
        </p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
        <Info size={13} className="text-brand-400 flex-shrink-0" />
        {t('merge.clickStartMerge')}
      </div>
    </div>
  )
}

// ─── Main MergePanel Component ────────────────────────────────────────────────

export default function MergePanel({ folderPath, branches, activeBranch, onMergeComplete }) {
  const { t } = useTranslation()
  const [fromBranch, setFromBranch] = useState('')
  const [mergeState, setMergeState] = useState('idle') // idle | merging | conflict | success | error | noconflict
  const [inRebase, setInRebase] = useState(false)
  const [pushStatusMsg, setPushStatusMsg] = useState('')
  const [pushCompletedMessage] = useState('')
  const [conflictFiles, setConflictFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [conflictBlocks, setConflictBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resolvedFiles, setResolvedFiles] = useState(new Set())
  const [remoteUrl, setRemoteUrl] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [diffContent, setDiffContent] = useState('')
  const [loadingDiff, setLoadingDiff] = useState(false)

  const isElectron = !!window.electronAPI
  const availableBranches = branches.filter(b => b !== activeBranch)
  const pendingConflictCount = conflictFiles.length
  const resolvedCount = resolvedFiles.size
  const allFilesResolved = pendingConflictCount === 0 && mergeState === 'conflict' && resolvedCount > 0

  const fetchRemoteUrl = async () => {
    const result = await window.electronAPI.getRemoteUrl(folderPath)
    if (result.success) setRemoteUrl(result.url)
  }

  const checkMergeStatus = async () => {
    const status = await window.electronAPI.getMergeStatus(folderPath)
    setInRebase(!!status.inRebase)
    if ((status.inMerge || status.inRebase) && status.conflicts.length > 0) {
      setMergeState('conflict')
      setConflictFiles(status.conflicts)
      setResolvedFiles(new Set())
    } else if (status.inMerge || status.inRebase) {
      setMergeState('conflict')
      setConflictFiles([])
    } else {
      setMergeState('idle')
      setConflictFiles([])
      setSelectedFile(null)
      setConflictBlocks([])
      setResolvedFiles(new Set())
    }
  }

  // ── Check merge status on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!folderPath || !isElectron) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkMergeStatus()
    fetchRemoteUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderPath])

  // ── Initiate merge ───────────────────────────────────────────────────────
  const handleMerge = async () => {
    if (!fromBranch) { setErrorMsg(t('merge.errors.selectSource')); return }
    if (!folderPath) { setErrorMsg(t('merge.errors.noFolder')); return }

    try {
      const statusResult = await window.electronAPI.getGitStatus(folderPath)
      const pending = (statusResult || []).filter(f => f.status && !f.status.startsWith('??'))
      if (pending.length > 0) {
        setErrorMsg(t('merge.errors.uncommittedChanges'))
        return
      }
    } catch { /* ignore */ }

    setLoading(true)
    setErrorMsg('')
    setMergeState('merging')

    try {
      const result = await window.electronAPI.gitMerge(folderPath, fromBranch)

      if (result.success) {
        setMergeState('success')
        try {
          const pushResult = await window.electronAPI.pushChanges(folderPath, activeBranch)
          if (!pushResult.success) {
            setErrorMsg(t('merge.errors.pushFailed', { error: pushResult.error || 'Unknown error' }))
          } else {
            setPushStatusMsg('✓ ' + t('merge.pushedSuccess'))
          }
        } catch (pushErr) {
          setErrorMsg(t('merge.errors.pushFailed', { error: pushErr.message || pushErr }))
        }
        setTimeout(() => {
          if (onMergeComplete) onMergeComplete()
          setMergeState('idle')
          setFromBranch('')
        }, MERGE_SUCCESS_DELAY_MS)

      } else if (result.conflict) {
        setMergeState('conflict')
        setErrorMsg('')
        await new Promise(resolve => setTimeout(resolve, CONFLICT_CHECK_DELAY_MS))
        await checkMergeStatus()
      } else {
        setMergeState('error')
        setErrorMsg(result.error || t('merge.errors.genericMerge'))
      }
    } catch (err) {
      setMergeState('error')
      setErrorMsg(t('merge.errors.generic', { error: err.message || err }))
    } finally {
      setLoading(false)
    }
  }

  // ── Abort merge or rebase ──────────────────────────────────────────────────
  const handleAbort = async () => {
    setLoading(true)
    try {
      const result = inRebase 
        ? await window.electronAPI.gitRebaseAbort(folderPath)
        : await window.electronAPI.gitAbortMerge(folderPath)

      if (result.success) {
        setMergeState('idle')
        setConflictFiles([])
        setSelectedFile(null)
        setConflictBlocks([])
        setResolvedFiles(new Set())
        setFromBranch('')
        setErrorMsg('')
        if (onMergeComplete) onMergeComplete()
      } else {
        setErrorMsg(result.error || (inRebase ? t('merge.errors.rebaseAbort') : t('merge.errors.mergeAbort')))
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Select a conflict file to view ───────────────────────────────────────
  const handleSelectFile = async (filePath) => {
    setSelectedFile(filePath)
    setLoading(true)
    try {
      const result = await window.electronAPI.readFileContent(folderPath, filePath)
      if (result.success) {
        setFileContent(result.content)
        setConflictBlocks(parseConflicts(result.content))
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Resolve a single conflict block ──────────────────────────────────────
  const handleResolveBlock = useCallback((blockId, resolution) => {
    setConflictBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, resolved: resolution !== null, resolution } : b
    ))
  }, [])

  // ── Save resolved file and stage it ──────────────────────────────────────
  const handleSaveFile = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const newContent = reconstructFile(fileContent, conflictBlocks)
      await window.electronAPI.writeFileContent(folderPath, selectedFile, newContent)
      await window.electronAPI.gitStageFile(folderPath, selectedFile)
      setResolvedFiles(prev => { const next = new Set(prev); next.add(selectedFile); return next })
      setConflictFiles(prev => prev.filter(f => f !== selectedFile))
      setSelectedFile(null)
      setConflictBlocks([])
      setFileContent('')
    } finally {
      setLoading(false)
    }
  }

  // ── Finish merge or continue rebase ────────────────────────────────────────
  const handleFinishMerge = async () => {
    setLoading(true)
    try {
      if (inRebase) {
        const result = await window.electronAPI.gitRebaseContinue(folderPath)
        if (result.success) {
          if (result.finished) {
            setMergeState('success')
            setTimeout(() => {
              if (onMergeComplete) onMergeComplete()
              setMergeState('idle')
              setFromBranch('')
              setConflictFiles([])
              setResolvedFiles(new Set())
            }, MERGE_SUCCESS_DELAY_MS)
          } else {
            setErrorMsg('')
            await checkMergeStatus()
          }
        } else {
          if (result.conflict) {
            setErrorMsg(t('merge.errors.rebaseConflictNext'))
            await checkMergeStatus()
          } else {
            setErrorMsg(result.error || t('merge.errors.rebaseContinue'))
          }
        }
      } else {
        const msg = `Merge branch '${fromBranch || 'unknown'}' into ${activeBranch}`
        const result = await window.electronAPI.gitCommitMerge(folderPath, msg)
        if (result.success) {
          setMergeState('success')
          try {
            const pushResult = await window.electronAPI.pushChanges(folderPath, activeBranch)
            if (!pushResult.success) {
              setErrorMsg(t('merge.errors.pushFailed', { error: pushResult.error || 'Unknown error' }))
            } else {
              setPushStatusMsg('✓ ' + t('merge.pushedSuccess'))
            }
          } catch (pushErr) {
            setErrorMsg(t('merge.errors.pushFailed', { error: pushErr.message || pushErr }))
          }
          setTimeout(() => {
            if (onMergeComplete) onMergeComplete()
            setMergeState('idle')
            setFromBranch('')
            setConflictFiles([])
            setResolvedFiles(new Set())
          }, MERGE_SUCCESS_DELAY_MS)
        } else {
          setErrorMsg(result.error || t('merge.errors.finishMergeCommit'))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Branch diff preview ──────────────────────────────────────────────────
  const handleCompareDiff = async () => {
    if (!fromBranch || !folderPath) return
    setLoadingDiff(true)
    setErrorMsg('')
    try {
      const result = await window.electronAPI.gitDiffBranches(folderPath, activeBranch, fromBranch)
      if (result.success) {
        setDiffContent(result.diff || '')
        setShowDiff(true)
      } else {
        setErrorMsg(t('merge.errors.loadDiff', { error: result.error || 'Unknown' }))
      }
    } catch (err) {
      setErrorMsg(t('merge.errors.loadDiff', { error: err.message }))
    } finally {
      setLoadingDiff(false)
    }
  }

  const getGitHubPrUrl = () => {
    if (!remoteUrl) return null
    let cleanUrl = remoteUrl.trim()
    
    // Remove credentials like https://user:pass@github.com/...
    cleanUrl = cleanUrl.replace(/(https?:\/\/)([^@]+@)/, '$1')

    if (cleanUrl.startsWith('git@github.com:')) {
      cleanUrl = cleanUrl.replace('git@github.com:', 'https://github.com/')
    }
    // Handle other ssh formats like git@gitlab.com:
    cleanUrl = cleanUrl.replace(/^git@([^:]+):/, 'https://$1/')

    if (cleanUrl.endsWith('.git')) {
      cleanUrl = cleanUrl.slice(0, -4)
    }
    return `${cleanUrl}/compare/${activeBranch}...${fromBranch}`
  }

  const allBlocksResolved = conflictBlocks.length > 0 && conflictBlocks.every(b => b.resolved)
  const unresolvedCount = conflictBlocks.filter(b => !b.resolved).length

  if (!isElectron) return null

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── DIFF MODAL ──────────────────────────────────────────────────────── */}
      {showDiff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <GitBranch size={15} className="text-brand-400" />
                {t('merge.diffTitle')}: <span className="font-mono text-emerald-400">{activeBranch}</span>
                <ArrowRight size={14} className="text-slate-500" />
                <span className="font-mono text-indigo-400">{fromBranch}</span>
              </h3>
              <button onClick={() => setShowDiff(false)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {diffContent ? (
                <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-5">
                  {diffContent.split('\n').map((line, i) => (
                    <span key={i} className={`block ${
                      line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400 bg-emerald-950/30' :
                      line.startsWith('-') && !line.startsWith('---') ? 'text-rose-400 bg-rose-950/30' :
                      line.startsWith('@@') ? 'text-brand-400 bg-slate-800/60' :
                      'text-slate-400'
                    }`}>{line || ' '}</span>
                  ))}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                  <CheckCircle2 size={40} className="text-emerald-500 opacity-60" />
                  <p className="text-sm">{t('merge.noDifferences')}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t border-slate-700">
              <button onClick={() => setShowDiff(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors">
                {t('app.buttons.cancel')}
              </button>
              <button
                onClick={() => { 
                  const u = getGitHubPrUrl()
                  if (u) {
                    (window.electronAPI?.openExternalUrl?.(u) || Promise.resolve()).catch(() => window.open(u, '_blank'))
                  }
                }}
                disabled={!remoteUrl}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <GitMerge size={14} /> {t('merge.openPrGitHub')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IDLE STATE ──────────────────────────────────────────────────────── */}
      {mergeState === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!folderPath ? (
            <div className="text-center text-slate-500">
              <GitMerge size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-sm">{t('merge.noFolderPrompt')}</p>
            </div>
          ) : availableBranches.length === 0 ? (
            <div className="text-center text-slate-500">
              <GitBranch size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-sm font-medium">{t('merge.noOtherBranches')}</p>
              <p className="text-xs text-slate-600 mt-1">{t('merge.createBranchFirst')}</p>
            </div>
          ) : (
            <div className="w-full max-w-lg">
              {/* Title */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/20">
                  <GitMerge size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{t('merge.title')}</h2>
                <p className="text-sm text-slate-400">{t('merge.subtitle')}</p>
              </div>

              {pushCompletedMessage && (
                <div className="mb-4 text-sm text-emerald-300 font-medium text-center">{pushCompletedMessage}</div>
              )}

              {/* Merge flow diagram */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex-1 max-w-52">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mb-2 block text-center">{t('merge.destBranch')}</label>
                  <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-sm text-emerald-400 font-semibold">{activeBranch}</span>
                    </div>
                    <span className="text-[10px] text-emerald-500/60 mt-0.5 block">current HEAD</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 pt-5">
                  <ArrowDown size={20} className="text-slate-500 animate-bounce" style={{ animationDuration: '2s' }} />
                  <GitMerge size={16} className="text-purple-400" />
                </div>

                <div className="flex-1 max-w-52">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2 block text-center">{t('merge.srcBranch')}</label>
                  <select
                     value={fromBranch}
                     onChange={e => { setFromBranch(e.target.value); setErrorMsg('') }}
                     className={`w-full px-4 py-3 rounded-xl border text-center text-sm font-mono font-semibold focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer ${
                       fromBranch ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400' : 'bg-indigo-500/10 text-slate-400 border-indigo-500/30'
                     }`}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">{t('merge.selectBranch')}</option>
                    {availableBranches.map(b => (
                      <option key={b} value={b} className="bg-slate-900 text-indigo-300">{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleCompareDiff}
                  disabled={!fromBranch || loadingDiff}
                  className="w-full py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-slate-600"
                >
                  {loadingDiff
                    ? <><RefreshCw size={15} className="animate-spin" /> {t('merge.comparing')}</>
                    : <><GitBranch size={15} /> {t('merge.compareBtn')}</>
                  }
                </button>

                <button
                  onClick={() => { 
                    const u = getGitHubPrUrl()
                    if (u) {
                      (window.electronAPI?.openExternalUrl?.(u) || Promise.resolve()).catch(() => window.open(u, '_blank'))
                    }
                  }}
                  disabled={!fromBranch || !remoteUrl}
                  className="w-full py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-slate-600"
                >
                  <GitMerge size={15} /> {t('merge.githubPrBtn')}
                </button>

                <button
                  onClick={handleMerge}
                  disabled={!fromBranch || loading}
                  title={!fromBranch ? t('merge.errors.selectSource') : t('merge.startMergeBtn')}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 group ${
                    !fromBranch || loading
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-40'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20'
                  }`}
                >
                  {loading
                    ? <><RefreshCw size={16} className="animate-spin" /> {t('merge.merging')}</>
                    : !fromBranch
                      ? <><AlertTriangle size={16} /> {t('merge.selectBranch')}</>
                      : <><Zap size={16} className="group-hover:animate-pulse" /> {t('merge.startMergeBtn')}</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MERGING STATE ───────────────────────────────────────────────────── */}
      {mergeState === 'merging' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw size={48} className="animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-white">{t('merge.mergingTitle')}</p>
            <p className="text-sm text-slate-400 mt-2">
              <span className="font-mono text-indigo-400">{fromBranch}</span>
              <ArrowRight size={14} className="inline mx-2 text-slate-500" />
              <span className="font-mono text-emerald-400">{activeBranch}</span>
            </p>
          </div>
        </div>
      )}

      {/* ── SUCCESS STATE ───────────────────────────────────────────────────── */}
      {mergeState === 'success' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/40 animate-pulse">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">
              {inRebase ? t('merge.rebaseSuccessTitle') : t('merge.successTitle')}
            </h3>
            <p className="text-sm text-slate-400">
              {inRebase
                ? t('merge.rebaseSuccessDesc')
                : t('merge.successDesc', { branch: activeBranch })}
            </p>
            {pushStatusMsg && <p className="mt-2 text-sm text-emerald-300">{pushStatusMsg}</p>}
            {errorMsg && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs text-left">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ERROR STATE ─────────────────────────────────────────────────────── */}
      {mergeState === 'error' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <XCircle size={48} className="text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-rose-400 mb-2">
              {inRebase ? t('merge.rebaseErrorTitle') : t('merge.errorTitle')}
            </h3>
            <p className="text-sm text-slate-400 mb-6 bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-left font-mono">{errorMsg}</p>
            <button
              onClick={() => { setMergeState('idle'); setErrorMsg('') }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-sm font-medium transition-all"
            >
              {t('merge.backBtn')}
            </button>
          </div>
        </div>
      )}

      {/* ── CONFLICT STATE ──────────────────────────────────────────────────── */}
      {mergeState === 'conflict' && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Conflict Banner */}
          <div className="px-5 py-3 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-b border-amber-500/30 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">
                  {inRebase ? t('merge.rebasePausedTitle') : t('merge.pausedTitle')}
                </p>
                <p className="text-xs text-amber-400/60">
                  {loading
                    ? t('merge.loadingConflicts')
                    : pendingConflictCount > 0
                      ? pendingConflictCount === 1
                        ? t('merge.fileUnresolved')
                        : t('merge.filesUnresolved', { count: pendingConflictCount })
                      : resolvedCount > 0
                        ? inRebase
                          ? t('merge.allResolvedReadyRebase')
                          : t('merge.allResolvedReady')
                        : t('merge.analyzing')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleAbort}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all text-xs font-semibold flex-shrink-0"
            >
              <Ban size={12} /> {inRebase ? t('merge.abortRebaseBtn') : t('merge.abortMergeBtn')}
            </button>
          </div>

          {loading && !selectedFile ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-slate-300">{t('merge.loadingConflicts')}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">

              {/* ── File list sidebar ──────────────────────────────────────────── */}
              <div className="w-64 flex-shrink-0 border-r border-slate-700/50 flex flex-col min-h-0 bg-slate-900/30">
                <div className="px-4 py-3 border-b border-slate-700/30 flex-shrink-0">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {t('merge.conflictingFiles')}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {/* Pending files */}
                  {pendingConflictCount > 0 && (
                    <div className="pb-1">
                      <div className="px-2 pt-1 pb-1.5">
                        <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                          {t('merge.needsResolution', { count: pendingConflictCount })}
                        </span>
                      </div>
                      {conflictFiles.map(file => (
                        <button
                          key={file}
                          onClick={() => handleSelectFile(file)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs group ${
                            selectedFile === file
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                              : 'hover:bg-slate-800/60 border border-transparent text-slate-300 hover:text-white'
                          }`}
                        >
                          <FileWarning size={14} className={selectedFile === file ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'} />
                          <span className="font-mono truncate flex-1">{file}</span>
                          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No conflicts at all */}
                  {pendingConflictCount === 0 && resolvedCount === 0 && (
                    <div className="text-center py-6 px-3">
                      <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                      <p className="text-xs text-amber-300 font-semibold">{t('merge.analyzing')}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{t('gitOps.common.loading')}</p>
                    </div>
                  )}

                  {/* Resolved files */}
                  {resolvedCount > 0 && (
                    <>
                      <div className="px-2 pt-3 pb-1">
                        <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">
                          {t('merge.resolved', { count: resolvedCount })}
                        </span>
                      </div>
                      {[...resolvedFiles].map(file => (
                        <div key={file} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-emerald-400/60">
                          <CheckCircle2 size={14} />
                          <span className="font-mono truncate flex-1">{file}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* All done */}
                  {pendingConflictCount === 0 && resolvedCount > 0 && (
                    <div className="text-center py-4 px-3 mt-2">
                      <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs text-emerald-400 font-semibold">{t('merge.allResolved')}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {inRebase ? t('merge.clickFinishRebase') : t('merge.clickFinish')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Finish merge/rebase button */}
                <div className="p-3 border-t border-slate-700/30 flex-shrink-0">
                  <button
                    onClick={handleFinishMerge}
                    disabled={!allFilesResolved || loading}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      allFilesResolved
                        ? 'bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {loading
                      ? <><RefreshCw size={12} className="animate-spin" /> {inRebase ? t('merge.continuing') : t('merge.finishing')}</>
                      : inRebase
                        ? <><Check size={12} /> {t('merge.continueRebaseBtn')}</>
                        : <><GitMerge size={12} /> {t('merge.finishMergeBtn')}</>
                    }
                  </button>
                </div>
              </div>

              {/* ── Conflict editor panel ──────────────────────────────────────── */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!selectedFile ? (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <FileWarning size={40} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">{t('merge.selectFilePrompt')}</p>
                      <p className="text-xs text-slate-600 mt-1">{t('merge.selectFileDesc')}</p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-slate-500" />
                  </div>
                ) : (
                  <>
                    {/* File header */}
                    <div className="px-5 py-3 border-b border-slate-700/30 flex-shrink-0 bg-slate-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileWarning size={14} className="text-amber-400 flex-shrink-0" />
                          <span className="text-sm font-mono text-white font-semibold truncate">{selectedFile}</span>
                          {unresolvedCount > 0 && (
                            <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
                              {t('merge.unresolvedCount', { count: unresolvedCount })}
                            </span>
                          )}
                          {unresolvedCount === 0 && conflictBlocks.length > 0 && (
                            <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                              {t('merge.allResolvedLabel')}
                            </span>
                          )}
                        </div>
                        {allBlocksResolved && (
                          <button
                            onClick={handleSaveFile}
                            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-bold"
                          >
                            <Check size={12} /> {t('merge.saveMarkResolved')}
                          </button>
                        )}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {activeBranch} ({t('merge.yoursLabel')})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> {fromBranch || 'incoming'} ({t('merge.incomingLabel')})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> {t('merge.combinedLabel')}</span>
                      </div>
                    </div>

                    {/* Conflict blocks list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {conflictBlocks.length === 0 ? (
                        <NoConflictsBanner activeBranch={activeBranch} fromBranch={fromBranch} />
                      ) : (
                        conflictBlocks.map((block, idx) => (
                          <ConflictBlock
                            key={block.id}
                            block={block}
                            index={idx}
                            total={conflictBlocks.length}
                            onResolve={handleResolveBlock}
                            fromBranch={fromBranch}
                            activeBranch={activeBranch}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
