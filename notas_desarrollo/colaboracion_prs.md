# Colaboración y Pull Requests

**Ubicación esperada:** `src/components/PRPanel.jsx`, `src/components/ReviewPanel.jsx` (nuevos componentes)
**Contexto:** Integración con la API de proveedores para gestionar Pull Requests/Merge Requests directamente en MonGit.

---

## 1. Gestión de PRs/MRs

Ver, crear, comentar y mergear Pull Requests dentro de la aplicación.

**Componente PRPanel:**
```jsx
// src/components/PRPanel.jsx
export default function PRPanel({ folderPath, providers }) {
  const { t } = useTranslation()
  const [prs, setPRs] = useState([])
  const [filter, setFilter] = useState('open') // open, closed, all
  const [selectedPR, setSelectedPR] = useState(null)

  useEffect(() => {
    loadPRs()
  }, [filter])

  const loadPRs = async () => {
    // Obtener PRs de todos los proveedores conectados
    const allPRs = []
    for (const provider of providers) {
      if (provider.status === 'connected') {
        const prs = await window.electronAPI.getPullRequests(provider.id, filter)
        allPRs.push(...prs)
      }
    }
    setPRs(allPRs)
  }

  const handleCreatePR = async (title, description, targetBranch) => {
    try {
      await window.electronAPI.createPullRequest({
        title,
        description,
        sourceBranch: currentBranch,
        targetBranch,
        provider: selectedProvider
      })
      setSuccess('✓ Pull Request creado')
      loadPRs()
    } catch (err) {
      setError(t('errors.prCreationFailed'))
    }
  }

  const handleMergePR = async (prId) => {
    if (!confirm('¿Mergear este PR? Esta acción es irreversible.')) return
    try {
      await window.electronAPI.mergePullRequest(prId)
      setSuccess('✓ PR mergeado')
      loadPRs()
    } catch (err) {
      setError(t('errors.mergeFailed'))
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2">
        {['open', 'closed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === f ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            {f === 'open' ? '🟢 Abiertos' : f === 'closed' ? '🔴 Cerrados' : 'Todos'}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowCreatePRModal(true)}
        className="w-full bg-brand-500 hover:bg-brand-600 rounded-lg py-2 text-sm font-medium"
      >
        + Crear PR
      </button>

      <div className="space-y-2">
        {prs.map(pr => (
          <PRCard
            key={pr.id}
            pr={pr}
            onSelect={setSelectedPR}
            onMerge={handleMergePR}
          />
        ))}
      </div>

      {selectedPR && (
        <PRDetailsPanel pr={selectedPR} onClose={() => setSelectedPR(null)} />
      )}
    </div>
  )
}

// Componente para mostrar detalles del PR
function PRDetailsPanel({ pr, onClose }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Detalles del PR */}
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{pr.title}</h2>
          <p className="text-sm text-slate-400 mt-2">{pr.description}</p>
          <div className="flex gap-4 mt-4 text-sm">
            <span>De: <code className="text-brand-400">{pr.source}</code></span>
            <span>→ <code className="text-brand-400">{pr.target}</code></span>
          </div>
        </div>

        {/* Comentarios */}
        <div className="p-4 space-y-3">
          {comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>

        {/* Nueva respuesta */}
        <div className="p-4 border-t border-slate-700">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500"
          />
          <button className="mt-2 bg-brand-500 hover:bg-brand-600 rounded px-4 py-2 text-sm font-medium">
            Comentar
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 2. Comentarios de Review

Añadir feedback en líneas específicas del código.

**Comentarios Inline:**
```jsx
// En el visor de diff
function DiffViewer({ diff }) {
  const [selectedLine, setSelectedLine] = useState(null)
  const [comments, setComments] = useState({})

  const handleAddComment = (lineNumber, text) => {
    setComments(prev => ({
      ...prev,
      [lineNumber]: [...(prev[lineNumber] || []), {
        author: currentUser.name,
        text,
        timestamp: new Date()
      }]
    }))
  }

  return (
    <div className="font-mono text-xs bg-slate-900 rounded-lg overflow-hidden">
      {diff.map((line, i) => (
        <div
          key={i}
          onMouseEnter={() => setSelectedLine(i)}
          onMouseLeave={() => setSelectedLine(null)}
          className="border-b border-slate-700 hover:bg-slate-800/50"
        >
          <div className="flex">
            <span className="w-10 text-slate-600 px-2 py-1 text-center bg-slate-950">{i + 1}</span>
            <span className={`w-6 px-2 py-1 text-center ${
              line.type === 'added' ? 'bg-emerald-500/20 text-emerald-400' :
              line.type === 'removed' ? 'bg-rose-500/20 text-rose-400' :
              'text-slate-600'
            }`}>
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <span className="flex-1 px-3 py-1 text-slate-200">{line.content}</span>
          </div>
          {selectedLine === i && (
            <CommentThread
              comments={comments[i]}
              onAddComment={text => handleAddComment(i, text)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 3. Estado de Checks (CI/CD Status)

Mostrar estado de tests y CI pipeline antes de mergear.

**Componente ChecksStatus:**
```jsx
function ChecksStatus({ pr }) {
  const [checks, setChecks] = useState([])

  useEffect(() => {
    loadChecks()
  }, [pr.id])

  const loadChecks = async () => {
    const data = await window.electronAPI.getCheckRuns(pr.id)
    setChecks(data)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white mb-3">Estado de Checks</h3>
      {checks.map(check => (
        <div key={check.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            {check.status === 'completed' && check.conclusion === 'success' && (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            {check.status === 'completed' && check.conclusion === 'failure' && (
              <AlertCircle size={16} className="text-rose-400" />
            )}
            {check.status === 'in_progress' && (
              <RefreshCw size={16} className="text-indigo-400 animate-spin" />
            )}
            <div>
              <p className="text-sm font-medium text-white">{check.name}</p>
              <p className="text-xs text-slate-400">{check.status}</p>
            </div>
          </div>
          <a href={check.detailsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:underline">
            Ver detalles →
          </a>
        </div>
      ))}
    </div>
  )
}
```

---

## 4. Notificaciones

Alertas cuando hay PRs asignadas o comentarios pendientes.

```jsx
// Sistema de notificaciones
const [notifications, setNotifications] = useState([])

const checkNotifications = async () => {
  const assignedPRs = await window.electronAPI.getAssignedPRs()
  const pendingComments = await window.electronAPI.getPendingReviews()
  
  setNotifications([
    ...assignedPRs.map(pr => ({
      type: 'assigned-pr',
      title: `PR asignado: ${pr.title}`,
      data: pr
    })),
    ...pendingComments.map(review => ({
      type: 'pending-review',
      title: `Review pendiente en ${review.prTitle}`,
      data: review
    }))
  ])
}
```

---

*Nota: Requiere conexión con APIs de GitHub, GitLab, etc. para obtener PRs y checkruns.*
