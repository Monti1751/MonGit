import React, { useState, useEffect } from 'react'
import { X, GitCommit, RefreshCw, CheckCircle2, AlertCircle, MessageSquare, Code, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PRDiffViewer from './PRDiffViewer'

export default function PRDetailsPanel({ pr, repo, onClose, onMerge, getPRComments, createPRComment, getPRCheckRuns, getPRFiles }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('conversation') // conversation, diff, checks
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [checks, setChecks] = useState([])
  const [loadingChecks, setLoadingChecks] = useState(false)
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPRData()
  }, [pr.id])

  const loadPRData = async () => {
    setError('')
    setLoadingComments(true)
    setLoadingChecks(true)
    setLoadingFiles(true)

    try {
      const commentsData = await getPRComments(repo, pr.number)
      setComments(commentsData)
    } catch (e) {
      console.error('Error fetching comments:', e)
    } finally {
      setLoadingComments(false)
    }

    try {
      const checksData = await getPRCheckRuns(repo, pr.headSha)
      setChecks(checksData)
    } catch (e) {
      console.error('Error fetching checks:', e)
    } finally {
      setLoadingChecks(false)
    }

    try {
      const filesData = await getPRFiles(repo, pr.number)
      setFiles(filesData)
    } catch (e) {
      console.error('Error fetching files:', e)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      await createPRComment(repo, pr.number, newComment)
      setNewComment('')
      // Reload comments
      const updated = await getPRComments(repo, pr.number)
      setComments(updated)
    } catch (e) {
      setError(t('pr.details.errorComment', 'No se pudo publicar el comentario.'))
    } finally {
      setSubmittingComment(false)
    }
  }

  const handlePostInlineComment = async (path, line, body, commitId) => {
    try {
      const inlineDetails = { path, line, commitId }
      await createPRComment(repo, pr.number, body, inlineDetails)
      // Reload comments
      const updated = await getPRComments(repo, pr.number)
      setComments(updated)
    } catch (e) {
      setError(t('pr.details.errorInlineComment', 'No se pudo publicar el comentario inline.'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                pr.state === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {pr.state === 'open' ? t('pr.details.stateOpen', '🟢 Abierto') : t('pr.details.stateClosed', '🟣 Fusionado / Cerrado')}
              </span>
              <span className="text-xs text-slate-500 font-mono">#{pr.number}</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                {t('pr.details.by', 'por')} <strong className="text-slate-300">{pr.user}</strong>
              </span>
            </div>
            <h2 className="text-lg font-bold text-white truncate" title={pr.title}>{pr.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-brand-400 border border-slate-750">{pr.source}</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-750">{pr.target}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-850 mb-4 gap-2">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition ${
              activeTab === 'conversation'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={13} />
            {t('pr.details.tabConversation', 'Conversación')}
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition ${
              activeTab === 'diff'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code size={13} />
            {t('pr.details.tabFiles', 'Archivos cambiados')} ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('checks')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition ${
              activeTab === 'checks'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play size={13} />
            {t('pr.details.tabChecks', 'CI/CD Checks')} ({checks.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto mb-4 min-h-[40vh]">
          {error && (
            <div className="p-3 mb-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'conversation' && (
            <div className="space-y-4">
              {/* PR Description */}
              <div className="p-4 bg-slate-850/40 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <img src={pr.avatar} alt={pr.user} className="w-6 h-6 rounded-full border border-slate-700" />
                  <span className="text-xs font-bold text-slate-200">{pr.user}</span>
                  <span className="text-[10px] text-slate-500">{new Date(pr.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {pr.description || <em className="text-slate-500">{t('pr.details.noDescription', 'Sin descripción.')}</em>}
                </p>
              </div>

              {/* Comments Thread */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t('pr.details.comments', 'Comentarios')}
                </h3>
                {loadingComments ? (
                  <div className="flex justify-center p-6"><RefreshCw size={20} className="animate-spin text-brand-400" /></div>
                ) : comments.filter(c => !c.path).length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">{t('pr.details.noComments', 'No hay comentarios generales.')}</p>
                ) : (
                  comments.filter(c => !c.path).map(comment => (
                    <div key={comment.id} className="flex gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/20">
                      <img src={comment.avatar} alt={comment.user} className="w-6 h-6 rounded-full border border-slate-700 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-300">{comment.user}</span>
                          <span className="text-[10px] text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{comment.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            loadingFiles ? (
              <div className="flex justify-center p-12"><RefreshCw size={24} className="animate-spin text-brand-400" /></div>
            ) : (
              <PRDiffViewer
                files={files}
                comments={comments.filter(c => !!c.path)}
                onAddComment={handlePostInlineComment}
                prHeadSha={pr.headSha}
                currentUserName={pr.user}
              />
            )
          )}

          {activeTab === 'checks' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2">
                {t('pr.details.cicdStatus', 'Resultados de Integración Continua')}
              </h3>
              {loadingChecks ? (
                <div className="flex justify-center p-6"><RefreshCw size={20} className="animate-spin text-brand-400" /></div>
              ) : checks.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-1">{t('pr.details.noChecks', 'No hay checks de CI/CD para esta revisión.')}</p>
              ) : (
                checks.map(check => (
                  <div key={check.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      {check.status === 'completed' && check.conclusion === 'success' && (
                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      )}
                      {check.status === 'completed' && check.conclusion === 'failure' && (
                        <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                      )}
                      {(check.status === 'in_progress' || check.status === 'queued') && (
                        <RefreshCw size={16} className="text-indigo-400 animate-spin flex-shrink-0" />
                      )}
                      {check.status === 'completed' && check.conclusion !== 'success' && check.conclusion !== 'failure' && (
                        <AlertCircle size={16} className="text-slate-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-white">{check.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono capitalize">{check.status} {check.conclusion && `(${check.conclusion})`}</p>
                      </div>
                    </div>
                    {check.detailsUrl && (
                      <a
                        href={check.detailsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold hover:underline"
                      >
                        {t('pr.details.viewDetails', 'Detalles')} →
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-800 pt-4 flex gap-3 items-center justify-between mt-auto">
          {activeTab === 'conversation' ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={t('pr.details.writeComment', 'Escribe un comentario...')}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-brand-500"
                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
              />
              <button
                onClick={handlePostComment}
                disabled={submittingComment || !newComment.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition flex items-center gap-1.5 shadow"
              >
                {submittingComment ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                {t('pr.details.commentBtn', 'Comentar')}
              </button>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-semibold"
            >
              {t('app.buttons.cancel')}
            </button>
            {pr.state === 'open' && (
              <button
                onClick={() => onMerge(pr.number)}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-brand-500/10 glow-teal-sm"
              >
                <GitCommit size={13} />
                {t('pr.details.mergeBtn', 'Fusionar PR')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
