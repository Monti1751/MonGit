import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileCode, History, User, Search, RefreshCw, X, ArrowRightLeft } from 'lucide-react'

export default function FileAnalysisPanel({ folderPath }) {
  const { t } = useTranslation()
  const [filePath, setFilePath] = useState('')
  const [mode, setMode] = useState('history') // history or blame
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [history, setHistory] = useState([])
  const [blame, setBlame] = useState([])
  
  const [fileContent, setFileContent] = useState(null) // para ver version
  const [diffContent, setDiffContent] = useState(null) // para diff

  const handleAnalyze = async () => {
    if (!filePath.trim() || !folderPath) return
    setLoading(true)
    setError(null)
    setHistory([])
    setBlame([])
    setFileContent(null)
    setDiffContent(null)

    try {
      if (mode === 'history') {
        const result = await window.electronAPI.gitFileHistory(folderPath, filePath)
        if (result.success) setHistory(result.history)
        else setError(result.error)
      } else {
        const result = await window.electronAPI.gitBlame(folderPath, filePath)
        if (result.success) setBlame(result.blame)
        else setError(result.error)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewVersion = async (commitId) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.getFileAtCommit(folderPath, filePath, commitId)
      if (result.success) {
        setFileContent({ commitId, text: result.content })
        setDiffContent(null)
      } else {
        setError(result.error)
      }
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const handleDiff = async (commitId) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.gitDiffCommits(folderPath, `${commitId}^`, commitId)
      if (result.success) {
        setDiffContent({ commitId, text: result.diff || t('analysis.file.noDiff', 'Sin cambios visibles') })
        setFileContent(null)
      } else {
        setError(result.error)
      }
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="space-y-4 p-4 flex flex-col h-full">
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <button 
            onClick={() => { setMode('history'); setHistory([]); setBlame([]); setFileContent(null); setDiffContent(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'history' ? 'bg-brand-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}
          >
            <History size={14} /> {t('analysis.file.history', 'Historial')}
          </button>
          <button 
            onClick={() => { setMode('blame'); setHistory([]); setBlame([]); setFileContent(null); setDiffContent(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'blame' ? 'bg-indigo-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}
          >
            <User size={14} /> {t('analysis.file.blame', 'Blame')}
          </button>
        </div>

        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <FileCode size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input 
              placeholder={t('analysis.file.path', 'Ruta del archivo (ej. src/main.js)')}
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-brand-500 outline-none"
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loading || !filePath.trim()}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg px-4 flex items-center justify-center"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-2">{error}</div>}

        {fileContent && (
          <div className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl flex flex-col overflow-hidden mb-2">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/80">
              <span className="text-xs font-mono text-brand-400">Versión: {fileContent.commitId.slice(0,7)}</span>
              <button onClick={() => setFileContent(null)} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X size={12} /></button>
            </div>
            <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-auto">{fileContent.text}</pre>
          </div>
        )}

        {diffContent && (
          <div className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl flex flex-col overflow-hidden mb-2">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/80">
              <span className="text-xs font-mono text-indigo-400">Diff: {diffContent.commitId.slice(0,7)}</span>
              <button onClick={() => setDiffContent(null)} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X size={12} /></button>
            </div>
            <div className="p-3 overflow-auto">
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">
                {diffContent.text.split('\n').map((line, i) => (
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

        {!fileContent && !diffContent && (
          <div className="flex-1 overflow-y-auto bg-slate-800/30 rounded-xl border border-slate-700/50">
            {mode === 'history' && history.length > 0 && (
              <div className="p-2 space-y-1">
                {history.map(entry => (
                  <div key={entry.hash} className="p-3 bg-slate-800/80 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-brand-400">{entry.hash.substring(0, 7)}</span>
                        <span className="text-xs font-medium text-slate-300">{entry.message}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">{entry.author} • {entry.date}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleViewVersion(entry.hash)} className="px-2 py-1 bg-slate-700/50 hover:bg-slate-600 rounded text-slate-300 transition-colors">
                          Ver
                        </button>
                        <button onClick={() => handleDiff(entry.hash)} className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded transition-colors">
                          Diff
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mode === 'blame' && blame.length > 0 && (
              <div className="font-mono text-[11px]">
                {blame.map((line, i) => (
                  <div key={i} className="flex hover:bg-slate-700/30 border-b border-slate-700/30 group">
                    <div className="w-48 bg-slate-900/50 px-2 py-0.5 text-slate-500 flex-shrink-0 flex gap-2 overflow-hidden items-center">
                      {line.commit ? (
                        <>
                          <span className="text-brand-400/80 group-hover:text-brand-400 w-12 flex-shrink-0" title={line.commit}>{line.commit.slice(0, 7)}</span>
                          <span className="truncate w-16" title={line.author}>{line.author}</span>
                          <span className="text-[9px] w-16">{line.date}</span>
                        </>
                      ) : (
                        <span className="text-slate-600">---</span>
                      )}
                    </div>
                    <div className="flex-1 px-3 py-0.5 text-slate-300 whitespace-pre">
                      {line.code || ' '}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
