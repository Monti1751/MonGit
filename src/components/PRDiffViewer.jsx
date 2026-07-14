import React, { useState } from 'react'
import { MessageSquare, Plus, Send, X, CornerDownRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PRDiffViewer({ files, comments, onAddComment, prHeadSha, currentUserName }) {
  const { t } = useTranslation()
  const [selectedFile, setSelectedFile] = useState(files[0] || null)
  const [hoveredLine, setHoveredLine] = useState(null)
  const [activeCommentForm, setActiveCommentForm] = useState(null) // line index
  const [commentText, setCommentText] = useState('')

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500">
        <MessageSquare size={32} className="mb-2 text-slate-600" />
        <p className="text-sm">{t('pr.diff.noFiles', 'No hay archivos modificados en este PR.')}</p>
      </div>
    )
  }

  // Parse patch to line objects
  const parsePatch = (patch) => {
    if (!patch) return []
    const lines = patch.split('\n')
    let oldLine = 0
    let newLine = 0
    const result = []

    lines.forEach((line) => {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
        if (match) {
          oldLine = parseInt(match[1], 10) - 1
          newLine = parseInt(match[2], 10) - 1
        }
        result.push({ type: 'header', content: line, oldLine: null, newLine: null })
      } else if (line.startsWith('+')) {
        newLine++
        result.push({ type: 'added', content: line.slice(1), oldLine: null, newLine })
      } else if (line.startsWith('-')) {
        oldLine++
        result.push({ type: 'removed', content: line.slice(1), oldLine, newLine: null })
      } else {
        oldLine++
        newLine++
        result.push({ type: 'normal', content: line.slice(1), oldLine, newLine })
      }
    })
    return result
  }

  const diffLines = parsePatch(selectedFile.patch)

  const handleOpenForm = (newLineNum) => {
    setActiveCommentForm(newLineNum)
    setCommentText('')
  }

  const handleSubmitComment = (newLineNum) => {
    if (!commentText.trim()) return
    onAddComment(selectedFile.filename, newLineNum, commentText, prHeadSha)
    setActiveCommentForm(null)
    setCommentText('')
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-[60vh]">
      {/* File List */}
      <div className="col-span-1 bg-slate-950 border border-slate-800/80 rounded-xl overflow-y-auto p-2 space-y-1 animate-fadeIn">
        <h4 className="text-xs font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
          {t('pr.diff.changedFiles', 'Archivos cambiados')}
        </h4>
        {files.map(f => (
          <button
            key={f.filename}
            onClick={() => {
              setSelectedFile(f)
              setActiveCommentForm(null)
            }}
            className={`w-full text-left text-xs px-2.5 py-2 rounded-lg transition flex items-center justify-between ${
              selectedFile.filename === f.filename
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium'
                : 'text-slate-400 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <span className="truncate mr-2" title={f.filename}>{f.filename.split('/').pop()}</span>
            <div className="flex gap-1.5 text-[10px]">
              {f.additions > 0 && <span className="text-emerald-500">+{f.additions}</span>}
              {f.deletions > 0 && <span className="text-rose-500">-{f.deletions}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Code Diff Viewer */}
      <div className="col-span-3 bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col animate-fadeIn">
        <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
          <code className="text-xs font-mono text-slate-300">{selectedFile.filename}</code>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">diff</span>
        </div>
        <div className="flex-1 overflow-auto font-mono text-[11px] leading-5">
          {diffLines.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('pr.diff.noChanges', 'Sin cambios de código visibles.')}</div>
          ) : (
            diffLines.map((line, idx) => {
              const isCommentable = line.type !== 'header' && line.newLine !== null
              const isHovered = hoveredLine === idx

              // Find comments for this line of this file
              const fileLineComments = comments.filter(c => c.path === selectedFile.filename && Number(c.line) === line.newLine)

              return (
                <div key={idx} className="relative border-b border-slate-900/40">
                  <div
                    onMouseEnter={() => setHoveredLine(idx)}
                    onMouseLeave={() => setHoveredLine(null)}
                    className={`flex hover:bg-slate-850 transition-colors group relative ${
                      line.type === 'added' ? 'bg-emerald-950/15 border-l-2 border-emerald-500' :
                      line.type === 'removed' ? 'bg-rose-950/15 border-l-2 border-rose-500' :
                      line.type === 'header' ? 'bg-slate-900 text-brand-400/80 font-bold border-l-2 border-slate-700' :
                      'border-l-2 border-transparent'
                    }`}
                  >
                    {/* Line numbers */}
                    <span className="w-10 text-slate-600 text-right pr-2 select-none bg-slate-950/40 border-r border-slate-800/40">
                      {line.oldLine || ''}
                    </span>
                    <span className="w-10 text-slate-600 text-right pr-2 select-none bg-slate-950/40 border-r border-slate-800/40">
                      {line.newLine || ''}
                    </span>
                    
                    {/* Prefix sign */}
                    <span className={`w-6 text-center select-none ${
                      line.type === 'added' ? 'text-emerald-400 font-bold' :
                      line.type === 'removed' ? 'text-rose-400 font-bold' : 'text-slate-600'
                    }`}>
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>

                    {/* Code line content */}
                    <span className={`flex-1 pl-2 whitespace-pre ${
                      line.type === 'added' ? 'text-emerald-300' :
                      line.type === 'removed' ? 'text-rose-300 line-through opacity-70' :
                      line.type === 'header' ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {line.content || ' '}
                    </span>

                    {/* Inline comment button */}
                    {isCommentable && (isHovered || activeCommentForm === line.newLine) && (
                      <button
                        onClick={() => handleOpenForm(line.newLine)}
                        className="absolute right-3 top-0.5 p-1 rounded bg-slate-800 hover:bg-brand-500 text-slate-400 hover:text-white transition shadow border border-slate-700/60 z-10"
                        title={t('pr.diff.addComment', 'Añadir comentario inline')}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>

                  {/* Render existing comments inline */}
                  {fileLineComments.map(comment => (
                    <div key={comment.id} className="pl-24 pr-4 py-2 bg-slate-900/40 border-l border-slate-850 flex gap-2 border-b border-slate-950">
                      <img src={comment.avatar} alt={comment.user} className="w-5 h-5 rounded-full mt-0.5 border border-slate-700" />
                      <div className="flex-1 bg-slate-950/40 rounded-xl p-2.5 border border-slate-900">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-300">{comment.user}</span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))}

                  {/* Inline comment form */}
                  {activeCommentForm === line.newLine && (
                    <div className="pl-24 pr-4 py-3 bg-slate-900/80 border-l border-brand-500/40 flex gap-2 border-b border-slate-950">
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 shadow-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-semibold text-brand-400 flex items-center gap-1">
                            <CornerDownRight size={10} />
                            {t('pr.diff.commentingLine', 'Comentando línea')} {line.newLine}
                          </span>
                          <button
                            onClick={() => setActiveCommentForm(null)}
                            className="p-0.5 text-slate-500 hover:text-slate-300 rounded transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder={t('pr.diff.writeCommentPlaceholder', 'Escribe tu comentario de revisión...')}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-brand-500 resize-none font-sans"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setActiveCommentForm(null)}
                            className="px-2.5 py-1 text-[10px] rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 transition"
                          >
                            {t('app.buttons.cancel')}
                          </button>
                          <button
                            onClick={() => handleSubmitComment(line.newLine)}
                            className="px-3 py-1 text-[10px] rounded-lg bg-brand-500 hover:bg-brand-400 text-white font-medium flex items-center gap-1 transition shadow-lg shadow-brand-500/10"
                          >
                            <Send size={8} />
                            {t('pr.diff.send', 'Enviar')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
