import React, { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Plus, RefreshCw, X, MessageSquare, Tag, User, Calendar, List, LayoutGrid, GripVertical, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function IssuesPanel({
  folderPath,
  providers,
  allRepos,
  getIssues,
  createIssue,
  changeIssueState,
  assignIssue,
  getIssueComments,
  createIssueComment,
  getLabels,
  getCollaborators,
  showToast
}) {
  const { t } = useTranslation()

  // Repo detection
  const [remoteUrl, setRemoteUrl] = useState('')
  const [matchingRepo, setMatchingRepo] = useState(null)

  // Issues list
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('open') // open, closed, all

  // View mode
  const [viewMode, setViewMode] = useState('list') // list, board

  // Detail panel
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createLabels, setCreateLabels] = useState([])
  const [availableLabels, setAvailableLabels] = useState([])
  const [loadingLabels, setLoadingLabels] = useState(false)
  const [creating, setCreating] = useState(false)

  // Drag & drop
  const [draggedIssue, setDraggedIssue] = useState(null)

  // ──────────────────────────────────────────────
  // Repo detection (same pattern as PRPanel)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (folderPath) {
      detectRepo()
    }
  }, [folderPath, allRepos])

  useEffect(() => {
    if (matchingRepo) {
      loadIssues()
    }
  }, [matchingRepo, filter])

  const detectRepo = async () => {
    try {
      const res = await window.electronAPI.getRemoteUrl(folderPath)
      if (res.success && res.url) {
        setRemoteUrl(res.url)
        const cleaned = res.url.replace(/\.git$/, '')
        let fullName = ''

        if (cleaned.includes('github.com')) {
          fullName = cleaned.split('github.com/').pop()?.split('github.com:').pop() || ''
        } else if (cleaned.includes('gitlab.com')) {
          fullName = cleaned.split('gitlab.com/').pop()?.split('gitlab.com:').pop() || ''
        }

        if (fullName) {
          const match = allRepos.find(r => r.fullName.toLowerCase() === fullName.toLowerCase())
          if (match) {
            setMatchingRepo(match)
            return
          }
        }
      }
      setMatchingRepo(null)
      setIssues([])
    } catch (e) {
      console.error('Error detecting repo:', e)
    }
  }

  // ──────────────────────────────────────────────
  // Load issues
  // ──────────────────────────────────────────────
  const loadIssues = async () => {
    if (!matchingRepo) return
    setLoading(true)
    try {
      const data = await getIssues(matchingRepo, filter)
      setIssues(data)
    } catch (e) {
      console.error('Error loading issues:', e)
      showToast(t('issues.errorLoading', 'No se pudieron cargar los issues.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // ──────────────────────────────────────────────
  // Issue detail
  // ──────────────────────────────────────────────
  const openDetail = async (issue) => {
    setSelectedIssue(issue)
    setNewComment('')
    setLoadingComments(true)
    try {
      const data = await getIssueComments(matchingRepo, issue.number)
      setComments(data)
    } catch (e) {
      console.error('Error loading comments:', e)
    } finally {
      setLoadingComments(false)
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedIssue) return
    setSubmittingComment(true)
    try {
      await createIssueComment(matchingRepo, selectedIssue.number, newComment)
      setNewComment('')
      const updated = await getIssueComments(matchingRepo, selectedIssue.number)
      setComments(updated)
    } catch (e) {
      console.error('Error posting comment:', e)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleChangeState = async (issueNumber, newState) => {
    try {
      await changeIssueState(matchingRepo, issueNumber, newState)
      // Update local state
      setIssues(prev => prev.map(i =>
        i.number === issueNumber ? { ...i, state: newState } : i
      ))
      if (selectedIssue && selectedIssue.number === issueNumber) {
        setSelectedIssue(prev => ({ ...prev, state: newState }))
      }
    } catch (e) {
      console.error('Error changing issue state:', e)
    }
  }

  // ──────────────────────────────────────────────
  // Create issue
  // ──────────────────────────────────────────────
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true)
    setCreateTitle('')
    setCreateDescription('')
    setCreateLabels([])

    setLoadingLabels(true)
    try {
      const labels = await getLabels(matchingRepo)
      setAvailableLabels(labels)
    } catch (e) {
      console.error('Error fetching labels:', e)
    } finally {
      setLoadingLabels(false)
    }
  }

  const toggleLabel = (labelName) => {
    setCreateLabels(prev =>
      prev.includes(labelName)
        ? prev.filter(l => l !== labelName)
        : [...prev, labelName]
    )
  }

  const handleCreate = async () => {
    if (!createTitle.trim()) return
    setCreating(true)
    try {
      await createIssue(matchingRepo, {
        title: createTitle,
        body: createDescription,
        labels: createLabels
      })
      showToast(t('issues.successCreated', 'Issue creado correctamente.'), 'success')
      setShowCreateModal(false)
      loadIssues()
    } catch (e) {
      showToast(e.message || t('issues.errorCreating', 'Error al crear el issue.'), 'error')
    } finally {
      setCreating(false)
    }
  }

  // ──────────────────────────────────────────────
  // Kanban helpers
  // ──────────────────────────────────────────────
  const classifyIssue = (issue) => {
    if (issue.state === 'closed') return 'closed'
    const labelNames = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name || '').toLowerCase())
    if (labelNames.some(n => n.includes('in progress') || n.includes('wip') || n.includes('doing'))) {
      return 'inProgress'
    }
    return 'open'
  }

  const kanbanColumns = [
    { key: 'open', title: t('issues.board.open', 'Abierto'), color: 'emerald' },
    { key: 'inProgress', title: t('issues.board.inProgress', 'En progreso'), color: 'amber' },
    { key: 'closed', title: t('issues.board.closed', 'Cerrado'), color: 'purple' }
  ]

  const getKanbanIssues = useCallback(() => {
    const groups = { open: [], inProgress: [], closed: [] }
    issues.forEach(issue => {
      const col = classifyIssue(issue)
      groups[col].push(issue)
    })
    return groups
  }, [issues])

  // Drag & drop handlers
  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', issue.number.toString())
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault()
    if (!draggedIssue) return

    const sourceColumn = classifyIssue(draggedIssue)
    if (sourceColumn === targetColumn) {
      setDraggedIssue(null)
      return
    }

    // Determine new state based on target column
    if (targetColumn === 'closed' && sourceColumn !== 'closed') {
      await handleChangeState(draggedIssue.number, 'closed')
    } else if (targetColumn !== 'closed' && sourceColumn === 'closed') {
      await handleChangeState(draggedIssue.number, 'open')
    }

    setDraggedIssue(null)
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  const timeAgo = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}m`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 30) return `${diffD}d`
    return date.toLocaleDateString()
  }

  const renderLabel = (label) => {
    const name = typeof label === 'string' ? label : label.name || ''
    const color = typeof label === 'string' ? '#6b7280' : label.color ? `#${label.color.replace('#', '')}` : '#6b7280'
    return (
      <span
        key={name}
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-tight border"
        style={{
          backgroundColor: `${color}20`,
          color: color,
          borderColor: `${color}40`
        }}
      >
        {name}
      </span>
    )
  }

  // ──────────────────────────────────────────────
  // Render: No folder
  // ──────────────────────────────────────────────
  if (!folderPath) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <AlertCircle size={48} className="mb-4 text-slate-600" />
        <p className="text-sm font-medium">{t('app.status.noFolder', 'No hay ninguna carpeta abierta.')}</p>
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // Render: No linked repo
  // ──────────────────────────────────────────────
  if (!matchingRepo) {
    return (
      <div className="p-8 max-w-xl mx-auto flex flex-col items-center text-center justify-center min-h-[40vh] animate-fadeIn">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-base font-bold text-white mb-2">
          {t('issues.noLinkedTitle', 'Repositorio no vinculado a cuenta cloud')}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {t('issues.noLinkedDesc', 'Para gestionar Issues, debes añadir tu cuenta (GitHub/GitLab) en el panel de Proveedores y clonar o abrir un repositorio que coincida con tus repositorios remotos.')}
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-500">
          <span className="text-left font-bold text-slate-400 mb-1">{t('issues.detailsUrl', 'Detalles detectados:')}</span>
          <span className="truncate" title={remoteUrl}>URL: {remoteUrl || 'N/A'}</span>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // Render: Main panel
  // ──────────────────────────────────────────────
  return (
    <div className="p-4 flex flex-col h-full space-y-4 animate-fadeIn">
      {/* Top Filter and Actions */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-850">
          {[
            { key: 'open', label: t('issues.filterOpen', '🟢 Abiertos') },
            { key: 'closed', label: t('issues.filterClosed', '🟣 Cerrados') },
            { key: 'all', label: t('issues.filterAll', 'Todos') }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex p-0.5 rounded-lg bg-slate-950 border border-slate-850">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={t('issues.viewList', 'Vista lista')}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'board'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={t('issues.viewBoard', 'Vista tablero')}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            onClick={loadIssues}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title={t('issues.refresh', 'Actualizar')}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1 transition shadow-lg shadow-brand-500/10 glow-teal-sm"
          >
            <Plus size={14} />
            {t('issues.createBtn', 'Crear Issue')}
          </button>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <RefreshCw size={24} className="animate-spin text-brand-400 mb-2" />
          <p className="text-xs">{t('issues.loading', 'Buscando Issues...')}</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-slate-500">
          <AlertCircle size={32} className="mx-auto mb-2 text-slate-650" />
          <p className="text-xs font-medium">{t('issues.noResults', 'No se encontraron Issues.')}</p>
        </div>
      ) : viewMode === 'list' ? (
        /* ──────────── LIST VIEW ──────────── */
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[60vh] custom-scrollbar">
          {issues.map(issue => (
            <div
              key={issue.id}
              onClick={() => openDetail(issue)}
              className="group p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-700/80 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-slate-800/10 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-mono">#{issue.number}</span>
                  {issue.state === 'open' ? (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {t('issues.stateOpen', 'Abierto')}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-purple-400 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      {t('issues.stateClosed', 'Cerrado')}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition truncate">{issue.title}</h4>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {(issue.labels || []).map(l => renderLabel(l))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Assignee avatar */}
                {issue.assignee && issue.assignee.avatar && (
                  <img
                    src={issue.assignee.avatar}
                    alt={issue.assignee.login || issue.assignee.name || ''}
                    className="w-6 h-6 rounded-full border border-slate-700"
                    title={issue.assignee.login || issue.assignee.name || ''}
                  />
                )}

                {/* Comments count */}
                {(issue.comments != null && issue.comments > 0) && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MessageSquare size={10} />
                    {issue.comments}
                  </span>
                )}

                {/* Time */}
                <span className="text-[9px] text-slate-600 flex items-center gap-1">
                  <Calendar size={10} />
                  {timeAgo(issue.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ──────────── KANBAN BOARD VIEW ──────────── */
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <div className="flex gap-4 min-h-[55vh] pb-2">
            {kanbanColumns.map(col => {
              const grouped = getKanbanIssues()
              const columnIssues = grouped[col.key] || []
              const colorMap = {
                emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
                amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
                purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' }
              }
              const c = colorMap[col.color]

              return (
                <div
                  key={col.key}
                  className="flex-1 min-w-[240px] flex flex-col rounded-2xl border border-slate-800/60 bg-slate-950/30"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className={`px-4 py-3 border-b border-slate-800/60 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span className={`text-xs font-bold ${c.text}`}>{col.title}</span>
                    </div>
                    <span className={`text-[10px] font-mono ${c.text} ${c.bg} ${c.border} border px-1.5 py-0.5 rounded-full`}>
                      {columnIssues.length}
                    </span>
                  </div>

                  {/* Column body */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                    {columnIssues.map(issue => (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue)}
                        onClick={() => openDetail(issue)}
                        className="group p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl cursor-grab active:cursor-grabbing hover:border-slate-600/60 transition-all hover:bg-slate-800/70"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical size={12} className="text-slate-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] text-slate-500 font-mono">#{issue.number}</span>
                            <h5 className="text-xs font-semibold text-white group-hover:text-brand-400 transition truncate leading-tight mt-0.5">
                              {issue.title}
                            </h5>
                          </div>
                        </div>

                        {/* Labels */}
                        {(issue.labels || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2 pl-5">
                            {(issue.labels || []).slice(0, 3).map(l => renderLabel(l))}
                            {(issue.labels || []).length > 3 && (
                              <span className="text-[8px] text-slate-500 self-center">+{issue.labels.length - 3}</span>
                            )}
                          </div>
                        )}

                        {/* Footer meta */}
                        <div className="flex items-center justify-between pl-5">
                          <span className="text-[9px] text-slate-600">{timeAgo(issue.createdAt)}</span>
                          <div className="flex items-center gap-1.5">
                            {(issue.comments != null && issue.comments > 0) && (
                              <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                <MessageSquare size={9} /> {issue.comments}
                              </span>
                            )}
                            {issue.assignee && issue.assignee.avatar && (
                              <img
                                src={issue.assignee.avatar}
                                alt={issue.assignee.login || ''}
                                className="w-5 h-5 rounded-full border border-slate-700"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ──────────── ISSUE DETAIL PANEL ──────────── */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl p-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {selectedIssue.state === 'open' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t('issues.stateOpen', 'Abierto')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {t('issues.stateClosed', 'Cerrado')}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-mono">#{selectedIssue.number}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <User size={10} />
                    <strong className="text-slate-300">{selectedIssue.user}</strong>
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(selectedIssue.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white" title={selectedIssue.title}>{selectedIssue.title}</h2>

                {/* Labels */}
                {(selectedIssue.labels || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(selectedIssue.labels || []).map(l => renderLabel(l))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto mb-4 min-h-[30vh] custom-scrollbar space-y-4">
              {/* Assignee */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('issues.detail.assignee', 'Asignado')}:
                </span>
                {selectedIssue.assignee ? (
                  <div className="flex items-center gap-1.5">
                    {selectedIssue.assignee.avatar && (
                      <img src={selectedIssue.assignee.avatar} alt="" className="w-5 h-5 rounded-full border border-slate-700" />
                    )}
                    <span className="text-xs text-slate-300 font-medium">
                      {selectedIssue.assignee.login || selectedIssue.assignee.name || ''}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    {t('issues.detail.unassigned', 'Sin asignar')}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="p-4 bg-slate-850/40 border border-slate-800 rounded-xl">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t('issues.detail.description', 'Descripción')}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  {selectedIssue.avatar && (
                    <img src={selectedIssue.avatar} alt={selectedIssue.user} className="w-6 h-6 rounded-full border border-slate-700" />
                  )}
                  <span className="text-xs font-bold text-slate-200">{selectedIssue.user}</span>
                  <span className="text-[10px] text-slate-500">{new Date(selectedIssue.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedIssue.body || <em className="text-slate-500">{t('issues.detail.noDescription', 'Sin descripción.')}</em>}
                </p>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t('issues.detail.comments', 'Comentarios')}
                </h3>
                {loadingComments ? (
                  <div className="flex justify-center p-6"><RefreshCw size={20} className="animate-spin text-brand-400" /></div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">{t('issues.detail.noComments', 'No hay comentarios.')}</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/20">
                      {comment.avatar && (
                        <img src={comment.avatar} alt={comment.user} className="w-6 h-6 rounded-full border border-slate-700 mt-0.5" />
                      )}
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

            {/* Footer actions */}
            <div className="border-t border-slate-800 pt-4 flex gap-3 items-center justify-between mt-auto">
              <div className="flex-1 flex gap-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={t('issues.detail.writeComment', 'Escribe un comentario...')}
                  rows={1}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-brand-500 resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handlePostComment()
                    }
                  }}
                />
                <button
                  onClick={handlePostComment}
                  disabled={submittingComment || !newComment.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition flex items-center gap-1.5 shadow"
                >
                  {submittingComment ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                  {t('issues.detail.commentBtn', 'Comentar')}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-semibold"
                >
                  {t('app.buttons.cancel')}
                </button>
                {selectedIssue.state === 'open' ? (
                  <button
                    onClick={() => handleChangeState(selectedIssue.number, 'closed')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg"
                  >
                    <CheckCircle2 size={13} />
                    {t('issues.detail.closeIssue', 'Cerrar Issue')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleChangeState(selectedIssue.number, 'open')}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-brand-500/10 glow-teal-sm"
                  >
                    <ExternalLink size={13} />
                    {t('issues.detail.reopenIssue', 'Reabrir Issue')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── CREATE ISSUE MODAL ──────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <AlertCircle size={16} className="text-brand-400" />
                {t('issues.create.title', 'Crear nuevo Issue')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  {t('issues.create.titleLabel', 'Título del Issue')}
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  placeholder={t('issues.create.titlePlaceholder', 'ej: Bug: el botón de guardar no responde')}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  {t('issues.create.descLabel', 'Descripción')}
                </label>
                <textarea
                  rows={4}
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  placeholder={t('issues.create.descPlaceholder', 'Describe el issue con detalle...')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-brand-500 resize-none font-sans"
                />
              </div>

              {/* Labels selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Tag size={11} />
                  {t('issues.create.labelsLabel', 'Etiquetas')}
                </label>
                {loadingLabels ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>{t('issues.loading', 'Cargando...')}</span>
                  </div>
                ) : availableLabels.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">{t('issues.noLabels', 'No hay etiquetas disponibles.')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl max-h-[100px] overflow-y-auto custom-scrollbar">
                    {availableLabels.map(label => {
                      const name = typeof label === 'string' ? label : label.name || ''
                      const color = typeof label === 'string' ? '#6b7280' : label.color ? `#${label.color.replace('#', '')}` : '#6b7280'
                      const selected = createLabels.includes(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleLabel(name)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                            selected ? 'ring-1 ring-offset-1 ring-offset-slate-950' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: selected ? `${color}30` : `${color}15`,
                            color: color,
                            borderColor: selected ? color : `${color}40`,
                            ringColor: selected ? color : undefined
                          }}
                        >
                          {selected && <CheckCircle2 size={9} className="mr-1" />}
                          {name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-800 pt-4 flex gap-3 justify-end mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-semibold"
              >
                {t('app.buttons.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createTitle.trim()}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg disabled:opacity-50 disabled:pointer-events-none glow-teal-sm"
              >
                {creating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                {t('issues.create.submitBtn', 'Crear Issue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
