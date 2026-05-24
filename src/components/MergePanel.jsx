import React, { useState, useEffect, useCallback } from 'react'
import {
  GitMerge, GitBranch, AlertTriangle, Check, X,
  ChevronRight, FileWarning, RefreshCw, ArrowRight,
  CheckCircle2, XCircle, Layers, ArrowDown, Zap, Ban,
  Search
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
  const [hoveredResolution, setHoveredResolution] = useState(null)

  // Style highlights based on hover
  const oursHighlight = hoveredResolution === 'ours'
    ? 'border-emerald-500/40 bg-emerald-500/5 scale-[1.005] opacity-100 shadow-md shadow-emerald-500/5'
    : hoveredResolution === 'theirs'
      ? 'opacity-30 scale-[0.99] border-transparent'
      : hoveredResolution === 'both'
        ? 'border-purple-500/30 bg-purple-500/5 opacity-100 scale-[1.002]'
        : 'border-slate-700/50';

  const theirsHighlight = hoveredResolution === 'theirs'
    ? 'border-indigo-500/40 bg-indigo-500/5 scale-[1.005] opacity-100 shadow-md shadow-indigo-500/5'
    : hoveredResolution === 'ours'
      ? 'opacity-30 scale-[0.99] border-transparent'
      : hoveredResolution === 'both'
        ? 'border-purple-500/30 bg-purple-500/5 opacity-100 scale-[1.002]'
        : 'border-slate-700/50';

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      isResolved
        ? 'border-emerald-500/40 bg-slate-900/40 shadow-lg shadow-emerald-950/10'
        : 'border-slate-700 bg-slate-900/60 shadow-xl'
    }`}>
      {/* Block Header */}
      <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold select-none ${
        isResolved
          ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/10'
          : 'bg-slate-800/80 text-slate-300 border-b border-slate-800'
      }`}>
        <span className="flex items-center gap-2">
          {isResolved ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Conflicto #{block.id + 1} resuelto — Aceptado:{' '}
                <span className="font-bold font-mono">
                  {block.resolution === 'ours' ? 'Tus cambios' :
                   block.resolution === 'theirs' ? 'Cambios entrantes' : 'Ambos combinados'}
                </span>
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-slate-200">Conflicto #{block.id + 1} pendiente</span>
            </>
          )}
        </span>
        {isResolved && (
          <button
            onClick={() => onResolve(block.id, null)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-700 border border-slate-700/40 hover:border-slate-600 px-2 py-0.5 rounded-lg font-bold"
          >
            Modificar
          </button>
        )}
      </div>

      {!isResolved ? (
        <>
          {/* Side by side code view */}
          <div className="grid grid-cols-2 divide-x divide-slate-800 bg-[#080c14] overflow-hidden">
            {/* Ours */}
            <div className={`relative flex flex-col min-w-0 transition-all duration-300 ${oursHighlight}`}>
              <div className="px-3 py-2 bg-emerald-950/20 border-b border-emerald-900/30 text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <GitBranch size={10} />
                  Tus cambios (Local)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400/80 font-mono">
                  {block.ours.length} lín.
                </span>
              </div>
              <div className="flex font-mono text-xs overflow-x-auto max-h-60 leading-5">
                {/* Faux relative line numbers */}
                <div className="select-none text-right pr-2 pl-3 py-2 text-[10px] text-emerald-700/60 border-r border-emerald-950/30 bg-[#060a0f] flex flex-col justify-start min-w-[2.5rem]">
                  {block.ours.length > 0 ? (
                    block.ours.map((_, idx) => <div key={idx}>{idx + 1}</div>)
                  ) : (
                    <div>1</div>
                  )}
                </div>
                {/* Code body */}
                <div className="flex-1 py-2 px-3 text-emerald-300/90 whitespace-pre overflow-x-auto">
                  {block.ours.length > 0 ? (
                    block.ours.map((line, idx) => (
                      <div key={idx} className="hover:bg-emerald-500/10 px-1 rounded-sm min-h-[1.25rem] transition-colors duration-150">
                        {line || ' '}
                      </div>
                    ))
                  ) : (
                    <div className="text-emerald-700/50 italic select-none">(vacío)</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Theirs */}
            <div className={`relative flex flex-col min-w-0 transition-all duration-300 ${theirsHighlight}`}>
              <div className="px-3 py-2 bg-indigo-950/20 border-b border-indigo-900/30 text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <GitMerge size={10} />
                  Cambios entrantes
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400/80 font-mono">
                  {block.theirs.length} lín.
                </span>
              </div>
              <div className="flex font-mono text-xs overflow-x-auto max-h-60 leading-5">
                {/* Faux relative line numbers */}
                <div className="select-none text-right pr-2 pl-3 py-2 text-[10px] text-indigo-700/60 border-r border-indigo-950/30 bg-[#060a0f] flex flex-col justify-start min-w-[2.5rem]">
                  {block.theirs.length > 0 ? (
                    block.theirs.map((_, idx) => <div key={idx}>{idx + 1}</div>)
                  ) : (
                    <div>1</div>
                  )}
                </div>
                {/* Code body */}
                <div className="flex-1 py-2 px-3 text-indigo-300/90 whitespace-pre overflow-x-auto">
                  {block.theirs.length > 0 ? (
                    block.theirs.map((line, idx) => (
                      <div key={idx} className="hover:bg-indigo-500/10 px-1 rounded-sm min-h-[1.25rem] transition-colors duration-150">
                        {line || ' '}
                      </div>
                    ))
                  ) : (
                    <div className="text-indigo-700/50 italic select-none">(vacío)</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 p-3 bg-slate-950/40 border-t border-slate-800/60">
            <button
              onClick={() => onResolve(block.id, 'ours')}
              onMouseEnter={() => setHoveredResolution('ours')}
              onMouseLeave={() => setHoveredResolution(null)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/50 active:scale-[0.98] transition-all text-xs font-bold shadow-md shadow-emerald-950/20"
            >
              <Check size={14} className="text-emerald-400" />
              <span>Aceptar Míos</span>
            </button>
            <button
              onClick={() => onResolve(block.id, 'theirs')}
              onMouseEnter={() => setHoveredResolution('theirs')}
              onMouseLeave={() => setHoveredResolution(null)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-400/50 active:scale-[0.98] transition-all text-xs font-bold shadow-md shadow-indigo-950/20"
            >
              <Check size={14} className="text-indigo-400" />
              <span>Aceptar Entrantes</span>
            </button>
            <button
              onClick={() => onResolve(block.id, 'both')}
              onMouseEnter={() => setHoveredResolution('both')}
              onMouseLeave={() => setHoveredResolution(null)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400/50 active:scale-[0.98] transition-all text-xs font-bold shadow-md shadow-purple-950/20"
            >
              <Layers size={14} className="text-purple-400" />
              <span>Mantener Ambos</span>
            </button>
          </div>
        </>
      ) : (
        /* Resolved code preview */
        <div className="bg-[#05090f] relative overflow-hidden transition-all duration-300 border-t border-slate-800">
          <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 select-none">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20 shadow-sm shadow-emerald-950/20">
              Vista Previa de Resolución
            </span>
          </div>
          
          <div className="flex font-mono text-xs overflow-x-auto max-h-52 leading-5">
            {(() => {
              let lines = [];
              if (block.resolution === 'ours') {
                lines = block.ours;
              } else if (block.resolution === 'theirs') {
                lines = block.theirs;
              } else if (block.resolution === 'both') {
                lines = [...block.ours, ...block.theirs];
              }
              
              return (
                <>
                  <div className="select-none text-right pr-2 pl-3 py-2.5 text-[10px] text-emerald-800/50 border-r border-emerald-950/30 bg-[#03060a] flex flex-col justify-start min-w-[2.5rem]">
                    {lines.length > 0 ? (
                      lines.map((_, idx) => <div key={idx}>{idx + 1}</div>)
                    ) : (
                      <div>1</div>
                    )}
                  </div>
                  <div className="flex-1 py-2.5 px-3 text-slate-300 whitespace-pre overflow-x-auto">
                    {lines.length > 0 ? (
                      lines.map((line, idx) => (
                        <div key={idx} className="hover:bg-emerald-500/5 px-1 rounded-sm min-h-[1.25rem] transition-colors duration-150">
                          {line || ' '}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600 italic select-none">(vacío)</div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main MergePanel Component ──────────────────────────────────────────────────

export default function MergePanel({ folderPath, branches, activeBranch, onMergeComplete }) {
  const [fromBranch, setFromBranch] = useState('')
  const [mergeState, setMergeState] = useState('idle') // idle | merging | conflict | success | error
  const [pushStatusMsg, setPushStatusMsg] = useState('')
  const [pushCompletedMessage, setPushCompletedMessage] = useState('')
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
  const [searchTerm, setSearchTerm] = useState('')
  const [conflictCounts, setConflictCounts] = useState({})

  const isElectron = !!window.electronAPI
  const availableBranches = branches.filter(b => b !== activeBranch)

  // ── Check merge status on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!folderPath || !isElectron) return
    checkMergeStatus()
    fetchRemoteUrl()
  }, [folderPath])

  // ── Load conflict counts for files ───────────────────────────────────────
  useEffect(() => {
    const loadConflictCounts = async () => {
      if (!folderPath || !conflictFiles.length) {
        setConflictCounts({})
        return
      }
      
      const counts = {}
      for (const file of conflictFiles) {
        try {
          const result = await window.electronAPI.readFileContent(folderPath, file)
          if (result.success) {
            const parsed = parseConflicts(result.content)
            counts[file] = parsed.blocks.length
          } else {
            counts[file] = 0
          }
        } catch (err) {
          console.error('Error reading conflict file:', file, err)
          counts[file] = 0
        }
      }
      setConflictCounts(counts)
    }
    
    loadConflictCounts()
  }, [conflictFiles, folderPath])

  // ── Bulk resolve method ──────────────────────────────────────────────────
  const resolveAllBlocks = (resolution) => {
    setConflictBlocks(prev => prev.map(b => ({
      ...b,
      resolved: true,
      resolution
    })))
  }

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

    // Check for uncommitted changes before merging (ignore untracked files)
    try {
      const statusResult = await window.electronAPI.getGitStatus(folderPath);
      const pending = (statusResult || []).filter(f => f.status && !f.status.startsWith('??'));
      if (pending.length > 0) {
        setErrorMsg('Hay cambios sin commitear. Por favor realiza un commit o descarta los cambios antes de fusionar.');
        setLoading(false);
        return;
      }
    } catch (statusErr) {
      console.error('Error checking git status:', statusErr);
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
          const pushResult = await window.electronAPI.pushChanges(folderPath, activeBranch)
          console.log('Push result:', pushResult)
          if (!pushResult.success) {
            console.error('Push after merge failed:', pushResult.error)
            setErrorMsg('La fusión se completó localmente, pero el envío al remoto falló:\n' + (pushResult.error || 'Error desconocido'))
          } else {
            setPushStatusMsg('✓ Cambios enviados a GitHub correctamente')
          }
        } catch (pushErr) {
          console.error('Push after merge exception:', pushErr)
          setErrorMsg('La fusión se completó localmente, pero ocurrió un error al enviar: ' + (pushErr.message || pushErr))
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
          const pushResult = await window.electronAPI.pushChanges(folderPath, activeBranch)
          console.log('Push after commit result:', pushResult)
          if (!pushResult.success) {
            console.error('Push after merge commit failed:', pushResult.error)
            setErrorMsg('La fusión se confirmó localmente, pero el envío al remoto falló:\n' + (pushResult.error || 'Error desconocido'))
          } else {
            setPushStatusMsg('✓ Cambios enviados a GitHub correctamente')
          }
        } catch (pushErr) {
          console.error('Push after merge commit exception:', pushErr)
          setErrorMsg('La fusión se confirmó localmente, pero ocurrió un error al enviar: ' + (pushErr.message || pushErr))
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
                {/* Optional push status when idle */}
                {pushCompletedMessage && (
                  <div className="mb-4 text-sm text-emerald-300 font-medium text-center">
                    {pushCompletedMessage}
                  </div>
                )}

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
            <p className="text-sm text-slate-400">
               Los cambios se han fusionado correctamente en <span className="font-mono text-emerald-400">{activeBranch}</span>.
             </p>
             {pushStatusMsg && (
               <p className="mt-2 text-sm text-emerald-300">{pushStatusMsg}</p>
             )}
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
              <div className="w-68 flex-shrink-0 border-r border-slate-700/50 flex flex-col min-h-0 bg-[#090d16]">
                <div className="px-4 py-3.5 border-b border-slate-700/30 flex-shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Archivos con Conflictos</h3>
                    {conflictFiles.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono">
                        {conflictFiles.length}
                      </span>
                    )}
                  </div>
                  
                  {/* File Search */}
                  {conflictFiles.length > 2 && (
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar archivo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Overall Progress Bar */}
                {(conflictFiles.length > 0 || resolvedFiles.size > 0) && (
                  <div className="px-4 pt-3 pb-3 border-b border-slate-800/30 bg-slate-950/15 flex-shrink-0">
                    {(() => {
                      const totalFiles = conflictFiles.length + resolvedFiles.size
                      const percent = totalFiles > 0 ? Math.round((resolvedFiles.size / totalFiles) * 100) : 0
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                            <span className="select-none">Progreso de resolución</span>
                            <span className="font-bold font-mono text-emerald-400 bg-emerald-500/5 px-1.5 py-0.2 rounded border border-emerald-500/10">
                              {percent}% ({resolvedFiles.size}/{totalFiles})
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 ease-out"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conflictFiles.length === 0 && resolvedFiles.size > 0 && (
                    <div className="text-center py-8 px-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20 shadow-lg shadow-emerald-950/20">
                        <CheckCircle2 size={24} className="text-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-emerald-400 font-semibold">¡Todos resueltos!</p>
                      <p className="text-[10px] text-slate-500 mt-1">Listo para finalizar la fusión.</p>
                    </div>
                  )}
                  {conflictFiles.length === 0 && resolvedFiles.size === 0 && (
                    <div className="text-center py-8 px-3">
                      <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs text-amber-300 font-semibold">Analizando conflictos...</p>
                      <p className="text-[10px] text-slate-500 mt-1">Espera un momento.</p>
                    </div>
                  )}
                  
                  {/* File list mapping over filtered list */}
                  {(() => {
                    const filtered = conflictFiles.filter(file => file.toLowerCase().includes(searchTerm.toLowerCase()))
                    return filtered.map(file => (
                      <button
                        key={file}
                        onClick={() => handleSelectFile(file)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs group relative overflow-hidden ${
                          selectedFile === file
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold shadow-inner'
                            : 'hover:bg-slate-800/50 border border-transparent text-slate-400 hover:text-white'
                        }`}
                      >
                        <FileWarning size={14} className={selectedFile === file ? 'text-amber-400 flex-shrink-0' : 'text-slate-500 group-hover:text-amber-400 flex-shrink-0'} />
                        <span className="font-mono truncate flex-1 z-10">{file}</span>
                        
                        {/* Conflicts count badge */}
                        {conflictCounts[file] !== undefined && conflictCounts[file] > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold font-mono z-10 transition-all ${
                            selectedFile === file
                              ? 'bg-amber-400 text-slate-900 shadow-sm'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {conflictCounts[file]}
                          </span>
                        )}
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    ))
                  })()}
                  
                  {/* Resolved files */}
                  {resolvedFiles.size > 0 && (
                    <>
                      <div className="px-2 pt-4 pb-1 select-none">
                        <span className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">Resueltos</span>
                      </div>
                      {[...resolvedFiles].map(file => (
                        <div
                          key={file}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-emerald-400/40 font-mono bg-emerald-500/5 border border-emerald-500/5"
                        >
                          <CheckCircle2 size={13} className="text-emerald-500/60" />
                          <span className="truncate flex-1">{file}</span>
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
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 ${
                      allFilesResolved
                        ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-lg shadow-emerald-500/20 animate-pulse active:scale-95'
                        : 'bg-slate-800 border border-slate-700/60 text-slate-500 cursor-not-allowed select-none'
                    }`}
                  >
                    {loading ? (
                      <><RefreshCw size={12} className="animate-spin" /> Finalizando...</>
                    ) : (
                      <><GitMerge size={12} /> Concluir Fusión</>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Conflict editor ─────────────────────────────────────────────── */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#080b12]">
                {!selectedFile ? (
                  <div className="flex-1 flex items-center justify-center text-center p-8 bg-[#080b12]">
                    <div className="max-w-xs">
                      <div className="w-16 h-16 bg-slate-800/40 rounded-2xl border border-slate-700/30 flex items-center justify-center mx-auto mb-4 text-slate-500 shadow-md">
                        <FileWarning size={32} />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">Selecciona un archivo con conflictos</p>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Haz clic en un archivo en la barra lateral para inspeccionar y resolver sus diferencias.</p>
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
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <FileWarning size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-slate-200 font-semibold leading-none mb-1">{selectedFile}</span>
                          <span className="text-[10px] text-slate-500 font-medium font-mono">
                            {conflictBlocks.filter(b => b.resolved).length} de {conflictBlocks.length} resueltos
                          </span>
                        </div>
                      </div>
                      
                      {/* Bulk actions and Save Button */}
                      <div className="flex items-center gap-2">
                        {conflictBlocks.length > 1 && conflictBlocks.some(b => !b.resolved) && (
                          <div className="flex items-center gap-1 bg-slate-950/40 p-1 border border-slate-800 rounded-lg mr-2 select-none">
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-2">
                              Resolver todos:
                            </span>
                            <button
                              onClick={() => resolveAllBlocks('ours')}
                              className="px-2 py-1 rounded hover:bg-emerald-500/15 hover:text-emerald-300 text-emerald-400 text-[10px] font-bold transition-all"
                              title="Aceptar todos los míos para este archivo"
                            >
                              Míos
                            </button>
                            <span className="text-slate-800 text-xs">|</span>
                            <button
                              onClick={() => resolveAllBlocks('theirs')}
                              className="px-2 py-1 rounded hover:bg-indigo-500/15 hover:text-indigo-300 text-indigo-400 text-[10px] font-bold transition-all"
                              title="Aceptar todos los entrantes para este archivo"
                            >
                              Entrantes
                            </button>
                          </div>
                        )}
                        
                        {allBlocksResolved && (
                          <button
                            onClick={handleSaveFile}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-300 transition-all text-xs font-bold shadow-lg shadow-emerald-500/10 active:scale-95 animate-pulse"
                          >
                            <Check size={12} /> Guardar y continuar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* File conflict resolution progress bar line */}
                    {conflictBlocks.length > 0 && (
                      <div className="h-[2px] w-full bg-slate-950 flex-shrink-0">
                        {(() => {
                          const fileResolved = conflictBlocks.filter(b => b.resolved).length
                          const filePercent = Math.round((fileResolved / conflictBlocks.length) * 100)
                          return (
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                              style={{ width: `${filePercent}%` }}
                            />
                          )
                        })()}
                      </div>
                    )}

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
