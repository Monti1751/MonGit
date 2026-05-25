# Gestión Avanzada

**Ubicación esperada:** `src/components/AdvancedOps.jsx`, `src/components/MultiRepoManager.jsx` (nuevos componentes)
**Contexto:** Operaciones complejas para usuarios avanzados.

---

## 1. Workspace Multirepo

Gestionar varios repositorios a la vez.

**Componente MultiRepoManager:**
```jsx
// src/components/MultiRepoManager.jsx
export default function MultiRepoManager() {
  const [workspace, setWorkspace] = useState({
    name: 'My Workspace',
    repos: []
  })
  const [selected, setSelected] = useState(new Set())

  const handleAddRepo = async () => {
    const folderPath = await window.electronAPI.selectFolder()
    if (folderPath) {
      const repoInfo = await window.electronAPI.getRepoInfo(folderPath)
      setWorkspace(prev => ({
        ...prev,
        repos: [...prev.repos, { path: folderPath, ...repoInfo }]
      }))
    }
  }

  const handleBulkSync = async () => {
    const selectedRepos = workspace.repos.filter(r => selected.has(r.path))
    for (const repo of selectedRepos) {
      await window.electronAPI.gitPull(repo.path)
      await window.electronAPI.gitPush(repo.path)
    }
    setSuccess(`✓ Sincronizados ${selectedRepos.length} repositorios`)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">{workspace.name}</h2>
        <button
          onClick={handleAddRepo}
          className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm"
        >
          + Agregar Repositorio
        </button>
      </div>

      {workspace.repos.length > 0 && (
        <button
          onClick={handleBulkSync}
          disabled={selected.size === 0}
          className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-400 rounded-lg py-2 text-sm font-medium"
        >
          Sincronizar {selected.size} repositorio(s)
        </button>
      )}

      <div className="space-y-2">
        {workspace.repos.map(repo => (
          <div key={repo.path} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <input
              type="checkbox"
              checked={selected.has(repo.path)}
              onChange={e => {
                const newSelected = new Set(selected)
                if (e.target.checked) {
                  newSelected.add(repo.path)
                } else {
                  newSelected.delete(repo.path)
                }
                setSelected(newSelected)
              }}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{repo.name}</p>
              <p className="text-xs text-slate-400">{repo.path}</p>
            </div>
            <div className="text-xs text-slate-400">
              {repo.branch} • {repo.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 2. Submodules

Soporte para git submodules.

**Componente SubmodulesPanel:**
```jsx
// src/components/SubmodulesPanel.jsx
function SubmodulesPanel({ folderPath }) {
  const [submodules, setSubmodules] = useState([])

  useEffect(() => {
    loadSubmodules()
  }, [folderPath])

  const loadSubmodules = async () => {
    const list = await window.electronAPI.getSubmodules(folderPath)
    setSubmodules(list)
  }

  const handleAddSubmodule = async (repoURL, path) => {
    await window.electronAPI.addSubmodule(folderPath, repoURL, path)
    setSuccess('✓ Submodule agregado')
    loadSubmodules()
  }

  const handleUpdateSubmodule = async (path) => {
    await window.electronAPI.updateSubmodule(folderPath, path)
    setSuccess(`✓ Submodule actualizado`)
    loadSubmodules()
  }

  const handleRemoveSubmodule = async (path) => {
    if (confirm('¿Remover este submodule?')) {
      await window.electronAPI.removeSubmodule(folderPath, path)
      setSuccess('✓ Submodule removido')
      loadSubmodules()
    }
  }

  return (
    <div className="space-y-4 p-4">
      <button className="w-full bg-brand-500 rounded-lg py-2 text-sm font-medium">
        + Agregar Submodule
      </button>

      <div className="space-y-2">
        {submodules.map(sub => (
          <div key={sub.path} className="bg-slate-800 p-3 rounded-lg">
            <p className="font-medium text-white">{sub.name}</p>
            <p className="text-xs text-slate-400">{sub.url}</p>
            <p className="text-xs text-slate-500 mt-1">Path: {sub.path}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleUpdateSubmodule(sub.path)}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
              >
                Actualizar
              </button>
              <button
                onClick={() => handleRemoveSubmodule(sub.path)}
                className="text-xs px-2 py-1 bg-rose-500/20 text-rose-400 rounded"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 3. Diff Avanzado

Comparar ramas, commits, visualizar cambios lado a lado.

**Componente AdvancedDiff:**
```jsx
// src/components/AdvancedDiff.jsx
export default function AdvancedDiff({ folderPath }) {
  const [comparisonType, setComparisonType] = useState('branches') // branches, commits, files
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [diff, setDiff] = useState(null)
  const [viewMode, setViewMode] = useState('split') // split, unified, side-by-side

  const handleCompare = async () => {
    let diffResult
    if (comparisonType === 'branches') {
      diffResult = await window.electronAPI.diffBranches(folderPath, source, target)
    } else if (comparisonType === 'commits') {
      diffResult = await window.electronAPI.diffCommits(folderPath, source, target)
    }
    setDiff(diffResult)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        {['branches', 'commits', 'files'].map(type => (
          <button
            key={type}
            onClick={() => setComparisonType(type)}
            className={`px-3 py-1 rounded text-sm ${
              comparisonType === type
                ? 'bg-brand-500 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Origen"
          value={source}
          onChange={e => setSource(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
        />
        <span className="flex items-center text-slate-400">→</span>
        <input
          placeholder="Destino"
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleCompare}
          className="bg-brand-500 hover:bg-brand-600 rounded px-4 py-2 text-sm font-medium"
        >
          Comparar
        </button>
      </div>

      {diff && (
        <>
          <div className="flex gap-2">
            {['split', 'unified', 'side-by-side'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === mode
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {mode.replace('-', ' ')}
              </button>
            ))}
          </div>

          <DiffViewer diff={diff} viewMode={viewMode} />
        </>
      )}
    </div>
  )
}
```

---

## 4. Templates

Plantillas para commits y PRs.

**Componente TemplateManager:**
```jsx
// src/components/TemplateManager.jsx
const COMMIT_TEMPLATES = {
  'conventional': 'type(scope): subject\n\ndescription',
  'semantic': '[type] Subject\n\nDescription',
  'angular': 'type(scope): description\n\nBREAKING CHANGE: ...'
}

function TemplateManager() {
  const [templates, setTemplates] = useState(COMMIT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState('conventional')

  const handleApplyTemplate = (templateKey) => {
    const template = templates[templateKey]
    // Insertar template en el editor de commits
    setCommitMessage(template)
  }

  return (
    <div className="space-y-3 p-4">
      <h3 className="font-semibold text-white">Plantillas de Commit</h3>
      {Object.entries(templates).map(([key, template]) => (
        <button
          key={key}
          onClick={() => {
            setSelectedTemplate(key)
            handleApplyTemplate(key)
          }}
          className={`w-full text-left p-3 rounded-lg border-2 transition font-mono text-xs ${
            selectedTemplate === key
              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          <strong>{key}</strong>
          <div className="mt-1 opacity-75 whitespace-pre-wrap line-clamp-3">{template}</div>
        </button>
      ))}
    </div>
  )
}
```

---

*Nota: La gestión de multirepo requiere persistencia en `localStorage` o en archivos de configuración.*
