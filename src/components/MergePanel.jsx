import React, { useState, useEffect, useCallback } from 'react'
import {
  GitMerge, GitBranch, AlertTriangle, Check, X,
  ChevronRight, FileWarning, RefreshCw, ArrowRight,
  CheckCircle2, XCircle, Layers, ArrowDown, Zap, Ban
} from 'lucide-react'

// ─── Conflict Parser ────────────────────────────────────────────────────────────

function parseConflicts(content) {
  const lines = content.split('\n')
  const blocks = []
  let currentBlock = null
  let cleanLines = []
  let blockIndex = 0

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
      }
    } else if (currentBlock && line.startsWith('=======')) {
      currentBlock.section = 'theirs'
    } else if (currentBlock && line.startsWith('>>>>>>>')) {
      currentBlock.endLine = i
      currentBlock.theirMarker = line
      blocks.push(currentBlock)
      cleanLines.push({ type: 'conflict', blockId: currentBlock.id })
      currentBlock = null
    } else if (currentBlock) {
      if (currentBlock.section === 'ours') {
        currentBlock.ours.push(line)
      } else {
        currentBlock.theirs.push(line)
      }
    } else {
      cleanLines.push({ type: 'text', content: line })
    }
  }

  return { blocks, cleanLines }
}

function reconstructFile(content, blocks) {
  const lines = content.split('\n')
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('<<<<<<<')) {
      const block = blocks.find(b => b.startLine === i)
      if (block && block.resolved) {
        if (block.resolution === 'ours') {
          result.push(...block.ours)
        } else if (block.resolution === 'theirs') {
          result.push(...block.theirs)
        } else if (block.resolution === 'both') {
          result.push(...block.ours, ...block.theirs)
        }
        i = block.endLine + 1
        continue
      }
    }

    result.push(line)
    i++
  }

  return result.join('\n')
}

// ─── Conflict Block Card ────────────────────────────────────────────────────────

function ConflictBlock({ block, onResolve }) {
  const isResolved = block.resolved

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      isResolved
        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70'
        : 'border-amber-500/40 bg-slate-800/40'
    }`}>
      {/* Block Header */}
      <div className={`px-4 py-2 flex items-center justify-between text-xs font-semibold ${
        isResolved
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-amber-500/10 text-amber-400'
      }`}>
        <span className="flex items-center gap-2">
          {isResolved
            ? <><CheckCircle2 size={12} /> Conflicto resuelto — {
                block.resolution === 'ours' ? 'Tus cambios' :
                block.resolution === 'theirs' ? 'Cambios entrantes' : 'Ambos combinados'
              }</>
            : <><AlertTriangle size={12} /> Conflicto #{block.id + 1}</>
          }
        </span>
        {isResolved && (
          <button
            onClick={() => onResolve(block.id, null)}
            className="text-xs text-slate-400 hover:text-white transition-colors underline"
          >
            Deshacer
          </button>
        )}
      </div>

      {!isResolved && (
        <>
          {/* Side by side */}
          <div className="grid grid-cols-2 divide-x divide-slate-700/50">
            {/* Ours */}
            <div className="relative">
              <div className="px-3 py-1.5 bg-emerald-500/8 border-b border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <GitBranch size={10} />
                Tus cambios (HEAD)
              </div>
              <pre className="px-3 py-2 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-48 leading-5 whitespace-pre-wrap break-all">
                {block.ours.join('\n') || '(vacío)'}
              </pre>
            </div>
            {/* Theirs */}
            <div className="relative">
              <div className="px-3 py-1.5 bg-indigo-500/8 border-b border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <GitMerge size={10} />
                Cambios entrantes
              </div>
              <pre className="px-3 py-2 text-xs font-mono text-indigo-300/90 overflow-x-auto max-h-48 leading-5 whitespace-pre-wrap break-all">
                {block.theirs.join('\n') || '(vacío)'}
              </pre>
            </div>
          </div>

          {/* Resolution Actions */}
          <div className="flex items-center gap-2 p-3 bg-slate-900/40 border-t border-slate-700/30">
            <button
              onClick={() => onResolve(block.id, 'ours')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-400/50 transition-all text-xs font-semibold"
            >
              <Check size={12} /> Aceptar Míos
            </button>
            <button
              onClick={() => onResolve(block.id, 'theirs')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 hover:border-indigo-400/50 transition-all text-xs font-semibold"
            >
              <Check size={12} /> Aceptar Entrantes
            </button>
            <button
              onClick={() => onResolve(block.id, 'both')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 hover:border-purple-400/50 transition-all text-xs font-semibold"
            >
              <Layers size={12} /> Mantener Ambos
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main MergePanel Component ──────────────────────────────────────────────────

export default function MergePanel({ folderPath, branches, activeBranch, onMergeComplete }) {
  const [fromBranch, setFromBranch] = useState('')
  const [mergeState, setMergeState] = useState('idle') // idle | merging | conflict | success | error
  const [pushStatusMsg, setPushStatusMsg] = useState('')
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

  // ── Check merge status on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!folderPath || !isElectron) return
    checkMergeStatus()
    fetchRemoteUrl()
  }, [folderPath])

  const fetchRemoteUrl = async () => {
    const result = await window.electronAPI.getRemoteUrl(folderPath)
    if (result.success) {
      setRemoteUrl(result.url)
    }
  }

  const checkMergeStatus = async () => {
    const status = await window.electronAPI.getMergeStatus(folderPath)
    if (status.inMerge && status.conflicts.length > 0) {
      setMergeState('conflict')
      setConflictFiles(status.conflicts)
      setResolvedFiles(new Set())
    } else if (status.inMerge) {
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

  // ── Initiate merge ───────────────────────────────────────────────────────
  const handleMerge = async () => {
    if (!fromBranch) {
      setErrorMsg('Por favor selecciona una rama de origen')
      return
    }
    if (!folderPath) {
      setErrorMsg('No hay carpeta abierta')
      return
    }

    // Check for uncommitted changes before merging
    try {
      const statusResult = await window.electronAPI.getGitStatus(folderPath)
      if (statusResult && statusResult.length > 0) {
        setErrorMsg('Hay cambios sin commitear. Por favor realiza un commit o descarta los cambios antes de fusionar.')
        setLoading(false)
        return
      }
    } catch (statusErr) {
      console.error('Error checking git status:', statusErr)
    }

    setLoading(true)
    setErrorMsg('')
    setMergeState('merging')

    try {
      console.log(`Iniciando merge: ${folderPath} <- ${fromBranch}`)
      
      const result = await window.electronAPI.gitMerge(folderPath, fromBranch)
      console.log('Merge result:', result)
      
      if (result.success) {
        // Merge sin conflictos completado
        console.log('Merge successful without conflicts')
        setMergeState('success')
        // After merge, push changes to remote
        try {
          const pushResult = await window.electronAPI.pushChanges(folderPath)
          console.log('Push result:', pushResult)
          if (!pushResult.success) {
            console.error('Push after merge failed:', pushResult.error)
            setErrorMsg('Merge succeeded, but push failed: ' + (pushResult.error || 'unknown error'))
          } else {
            setPushStatusMsg('Cambios enviados al remoto')
          }
        } catch (pushErr) {
          console.error('Push after merge exception:', pushErr)
          setErrorMsg('Merge succeeded, but push error: ' + (pushErr.message || pushErr))
        }
        setTimeout(() => {
          if (onMergeComplete) onMergeComplete()
          setMergeState('idle')
          setFromBranch('')
        }, 2500)
      } else if (result.conflict) {
        // Merge con conflictos - necesitamos resolver
        console.log('Merge resulted in conflicts, checking status...')
        setMergeState('conflict')
        setErrorMsg('') // Limpiar error previo
        
        // Esperar un poco y luego obtener el estado actual
        await new Promise(resolve => setTimeout(resolve, 500))
        await checkMergeStatus()
      } else {
        // Error real en el merge
        console.log('Merge failed with error:', result.error)
        setMergeState('error')
        setErrorMsg(result.error || 'Error desconocido en merge')
      }
    } catch (err) {
      console.error('Merge error:', err)
      setMergeState('error')
      setErrorMsg('Error: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  // ── Abort merge ──────────────────────────────────────────────────────────
  const handleAbort = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitAbortMerge(folderPath)
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
        setErrorMsg(result.error)
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
        const parsed = parseConflicts(result.content)
        setConflictBlocks(parsed.blocks)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Resolve a single conflict block ──────────────────────────────────────
  const handleResolveBlock = useCallback((blockId, resolution) => {
    setConflictBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, resolved: resolution !== null, resolution }
        : b
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

      setResolvedFiles(prev => {
        const next = new Set(prev)
        next.add(selectedFile)
        return next
      })

      // Remove from conflict list
      setConflictFiles(prev => prev.filter(f => f !== selectedFile))
      setSelectedFile(null)
      setConflictBlocks([])
      setFileContent('')
    } finally {
      setLoading(false)
    }
  }

  // ── Finish merge ─────────────────────────────────────────────────────────
  const handleFinishMerge = async () => {
    setLoading(true)
    try {
      const msg = `Merge branch '${fromBranch || 'unknown'}' into ${activeBranch}`
      const result = await window.electronAPI.gitCommitMerge(folderPath, msg)
      if (result.success) {
        setMergeState('success')
        // After committing merge, push to remote
        try {
          const pushResult = await window.electronAPI.pushChanges(folderPath)
          if (!pushResult.success) {
            console.error('Push after merge commit failed:', pushResult.error)
            setErrorMsg('Merge commit succeeded, but push failed: ' + (pushResult.error || 'unknown error'))
          }
        } catch (pushErr) {
          console.error('Push after merge commit exception:', pushErr)
          setErrorMsg('Merge commit succeeded, but push error: ' + (pushErr.message || pushErr))
        }
        setTimeout(() => {
          if (onMergeComplete) onMergeComplete()
          setMergeState('idle')
          setFromBranch('')
          setConflictFiles([])
          setResolvedFiles(new Set())
        }, 2500)
      } else {
        setErrorMsg(result.error || 'Error desconocido en commit merge')
      }
    } finally {
      setLoading(false)
    }
  }

  const allBlocksResolved = conflictBlocks.length > 0 && conflictBlocks.every(b => b.resolved)
  const allFilesResolved = conflictFiles.length === 0 && mergeState === 'conflict'

  // ── Get GitHub PR URL ──────────────────────────────────────────────────────
  const getGitHubPrUrl = () => {
    if (!remoteUrl) return null
    
    // Convert git URL to GitHub URL
    let repoUrl = remoteUrl
    if (repoUrl.startsWith('git@github.com:')) {
      repoUrl = repoUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '')
    } else if (repoUrl.endsWith('.git')) {
      repoUrl = repoUrl.slice(0, -4)
    }
    
    return `${repoUrl}/compare/${activeBranch}...${fromBranch}`
  }

  const handleCompareDiff = async () => {
    if (!fromBranch || !folderPath) return
    
    setLoadingDiff(true)
    try {
      const result = await window.electronAPI.gitDiffBranches(folderPath, activeBranch, fromBranch)
      if (result.success) {
        setDiffContent(result.diff || 'No hay diferencias entre las ramas')
        setShowDiff(true)
      } else {
        setErrorMsg('Error al obtener el diff: ' + (result.error || 'Desconocido'))
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message)
    } finally {
      setLoadingDiff(false)
    }
  }

  if (!isElectron) return null

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── DIFF MODAL ────────────────────────────────────────────────────────── */}
      {showDiff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-slate-200">Diferencias: {activeBranch} → {fromBranch}</h3>
              <button
                onClick={() => setShowDiff(false)}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            {/* Diff Content */}
            <div className="flex-1 overflow-auto p-4">
              {diffContent ? (
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words bg-slate-800/50 p-3 rounded border border-slate-700">
                  {diffContent}
                </pre>
              ) : (
                <div className="text-center text-slate-400 py-8">No hay diferencias</div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex gap-2 p-4 border-t border-slate-700">
              <button
                onClick={() => setShowDiff(false)}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const prUrl = getGitHubPrUrl()
                  if (prUrl) window.open(prUrl, '_blank')
                }}
                disabled={!remoteUrl}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold transition-colors"
              >
                Abrir en GitHub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IDLE STATE: Merge configurator ──────────────────────────────────── */}
      {mergeState === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!folderPath ? (
            <div className="text-center text-slate-500">
              <GitMerge size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-sm">Abre una carpeta local para gestionar fusiones.</p>
            </div>
          ) : availableBranches.length === 0 ? (
            <div className="text-center text-slate-500">
              <GitBranch size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-sm">Solo existe una rama en este repositorio.</p>
              <p className="text-xs text-slate-600 mt-1">Crea una nueva rama para poder fusionar.</p>
            </div>
          ) : (
            <>
              {/* Merge Flow Visual */}
              <div className="w-full max-w-xl">
                {/* Title */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/20">
                    <GitMerge size={32} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Centro de Fusión</h2>
                  <p className="text-sm text-slate-400">Fusiona los cambios de otra rama en tu rama actual</p>
                </div>

                {/* Merge Diagram */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {/* Destination (current) */}
                  <div className="flex-1 max-w-48">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mb-2 block text-center">Rama destino</label>
                    <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-mono text-sm text-emerald-400 font-semibold">{activeBranch}</span>
                      </div>
                      <span className="text-[10px] text-emerald-500/60 mt-0.5 block">HEAD actual</span>
                    </div>
                  </div>

                  {/* Arrow Animation */}
                  <div className="flex flex-col items-center gap-1 pt-5">
                    <ArrowDown size={20} className="text-slate-500 animate-bounce" style={{ animationDuration: '2s' }} />
                    <GitMerge size={16} className="text-purple-400" />
                  </div>

                  {/* Source (from) */}
                  <div className="flex-1 max-w-48">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2 block text-center">Rama origen</label>
                    <select
                      value={fromBranch}
                      onChange={e => setFromBranch(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-indigo-500/30 text-center text-sm font-mono font-semibold focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer ${fromBranch ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400' : 'bg-indigo-500/10 text-slate-400'}`}
                    >
                      <option value="" className="bg-slate-900 text-slate-400">Selecciona rama...</option>
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

                {/* Compare Locally button */}
                <button
                  onClick={handleCompareDiff}
                  disabled={!fromBranch || loadingDiff}
                  className="w-full py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 group mb-3 border border-slate-600"
                >
                  {loadingDiff ? (
                    <><RefreshCw size={16} className="animate-spin" /> Comparando...</>
                  ) : (
                    <><GitBranch size={16} /> Comparar Localmente</>  
                  )}
                </button>

                {/* Compare & Pull Request button */}
                <button
                  onClick={() => {
                    const prUrl = getGitHubPrUrl()
                    if (prUrl) window.open(prUrl, '_blank')
                  }}
                  disabled={!fromBranch || !remoteUrl}
                  className="w-full py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 group mb-3 border border-slate-600"
                >
                  <GitMerge size={16} /> Comparar & Pull Request
                </button>

                {/* Merge button */}
                <button
                  onClick={handleMerge}
                  disabled={!fromBranch || loading}
                  title={!fromBranch ? 'Selecciona una rama de origen primero' : 'Iniciar fusión git merge'}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 group ${
                    !fromBranch || loading
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-40'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20 hover:shadow-purple-500/30'
                  }`}
                >
                  {loading ? (
                    <><RefreshCw size={16} className="animate-spin" /> Fusionando...</>
                  ) : !fromBranch ? (
                    <><AlertTriangle size={16} /> Selecciona rama</> 
                  ) : (
                    <><Zap size={16} className="group-hover:animate-pulse" /> Iniciar Fusión (Git Merge)</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MERGING STATE ───────────────────────────────────────────────────── */}
      {mergeState === 'merging' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw size={48} className="animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-white">Fusionando ramas...</p>
            <p className="text-sm text-slate-400 mt-1">
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
            <h3 className="text-xl font-bold text-emerald-400 mb-2">¡Fusión completada!</h3>
            <p className="text-sm text-slate-400">Los cambios se han fusionado correctamente en <span className="font-mono text-emerald-400">{activeBranch}</span>.</p>
          </div>
        </div>
      )}

      {/* ── ERROR STATE ─────────────────────────────────────────────────────── */}
      {mergeState === 'error' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <XCircle size={48} className="text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-rose-400 mb-2">Error de fusión</h3>
            <p className="text-sm text-slate-400 mb-4">{errorMsg}</p>
            <button
              onClick={() => { setMergeState('idle'); setErrorMsg('') }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-sm font-medium transition-all"
            >
              Volver al inicio
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
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={16} className="text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">Fusión pausada — Conflictos detectados</p>
                <p className="text-xs text-amber-400/60">
                  {loading ? (
                    'Cargando información de conflictos...'
                  ) : conflictFiles.length > 0
                    ? `${conflictFiles.length} archivo${conflictFiles.length > 1 ? 's' : ''} con conflictos pendientes`
                    : 'Todos los conflictos resueltos — lista para concluir'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleAbort}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all text-xs font-semibold"
            >
              <Ban size={12} /> Abortar Fusión
            </button>
          </div>

          {loading && !selectedFile ? (
            // Loading state - show spinner
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-slate-300">Cargando conflictos...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">
              {/* ── File list ──────────────────────────────────────────────────── */}
              <div className="w-64 flex-shrink-0 border-r border-slate-700/50 flex flex-col min-h-0 bg-slate-900/30">
                <div className="px-4 py-3 border-b border-slate-700/30 flex-shrink-0">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Archivos en conflicto</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conflictFiles.length === 0 && resolvedFiles.size > 0 && (
                    <div className="text-center py-6 px-3">
                      <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs text-emerald-400 font-semibold">¡Todos resueltos!</p>
                      <p className="text-[10px] text-slate-500 mt-1">Puedes concluir la fusión.</p>
                    </div>
                  )}
                  {conflictFiles.length === 0 && resolvedFiles.size === 0 && (
                    <div className="text-center py-6 px-3">
                      <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                      <p className="text-xs text-amber-300 font-semibold">Analizando conflictos...</p>
                      <p className="text-[10px] text-slate-500 mt-1">Por favor espera.</p>
                    </div>
                  )}
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
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  {/* Resolved files */}
                  {resolvedFiles.size > 0 && (
                    <>
                      <div className="px-2 pt-3 pb-1">
                        <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Resueltos</span>
                      </div>
                      {[...resolvedFiles].map(file => (
                        <div
                          key={file}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-emerald-400/50"
                        >
                          <CheckCircle2 size={14} />
                          <span className="font-mono truncate flex-1">{file}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Finish merge button */}
                <div className="p-3 border-t border-slate-700/30 flex-shrink-0">
                  <button
                    onClick={handleFinishMerge}
                    disabled={!allFilesResolved || loading}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      allFilesResolved
                        ? 'bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white shadow-lg shadow-emerald-500/20 animate-pulse'
                        : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {loading
                      ? <><RefreshCw size={12} className="animate-spin" /> Finalizando...</>
                      : <><GitMerge size={12} /> Concluir Fusión</>
                    }
                  </button>
                </div>
              </div>

              {/* ── Conflict editor ─────────────────────────────────────────────── */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!selectedFile ? (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <FileWarning size={40} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Selecciona un archivo con conflictos</p>
                      <p className="text-xs text-slate-600 mt-1">para ver y resolver las diferencias</p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-slate-500" />
                  </div>
                ) : (
                  <>
                    {/* File header */}
                    <div className="px-5 py-3 border-b border-slate-700/30 flex items-center justify-between flex-shrink-0 bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <FileWarning size={14} className="text-amber-400" />
                        <span className="text-sm font-mono text-white font-semibold">{selectedFile}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
                          {conflictBlocks.filter(b => !b.resolved).length} pendiente{conflictBlocks.filter(b => !b.resolved).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {allBlocksResolved && (
                        <button
                          onClick={handleSaveFile}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-bold animate-pulse"
                        >
                          <Check size={12} /> Guardar y marcar como resuelto
                        </button>
                      )}
                    </div>

                    {/* Conflict blocks */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {conflictBlocks.map(block => (
                        <ConflictBlock
                          key={block.id}
                          block={block}
                          onResolve={handleResolveBlock}
                        />
                      ))}
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
