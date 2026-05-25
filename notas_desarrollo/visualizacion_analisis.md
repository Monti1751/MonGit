# Visualización y Análisis

**Ubicación esperada:** `src/components/StatsPanel.jsx`, `src/components/SearchPanel.jsx` (nuevos componentes)
**Contexto:** Nuevos paneles de análisis para dar visibilidad sobre la actividad del repositorio.

---

## 1. Estadísticas del Repositorio

Mostrar gráficos y datos sobre la actividad del repositorio.

**Componente StatsPanel:**
```jsx
// src/components/StatsPanel.jsx
export default function StatsPanel({ folderPath }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalCommits: 0,
    contributors: [],
    commitsByDay: [],
    linesAdded: 0,
    linesRemoved: 0,
    averageCommitSize: 0
  })

  useEffect(() => {
    loadStats()
  }, [folderPath])

  const loadStats = async () => {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getRepoStats(folderPath)
    setStats(data)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Commits" value={stats.totalCommits} />
        <StatCard title="Contributors" value={stats.contributors.length} />
        <StatCard title="Líneas añadidas" value={stats.linesAdded} color="emerald" />
        <StatCard title="Líneas eliminadas" value={stats.linesRemoved} color="rose" />
      </div>
      <CommitActivityChart data={stats.commitsByDay} />
      <ContributorsChart data={stats.contributors} />
    </div>
  )
}
```

**Electron API:**
```javascript
ipcMain.handle('get-repo-stats', async (event, path) => {
  const git = simpleGit(path)
  const log = await git.log()
  
  const totalCommits = log.total
  const contributors = new Set(log.all.map(c => c.author_name))
  const linesStats = await git.diff(['--stat'])
  
  return {
    totalCommits,
    contributors: Array.from(contributors),
    linesAdded: calculateLinesAdded(linesStats),
    linesRemoved: calculateLinesRemoved(linesStats),
    averageCommitSize: totalCommits > 0 ? (linesAdded + linesRemoved) / totalCommits : 0
  }
})
```

---

## 2. Búsqueda Avanzada

Filtrar commits por múltiples criterios.

**Componente SearchPanel:**
```jsx
// src/components/SearchPanel.jsx
function AdvancedSearch({ onSearch }) {
  const [filters, setFilters] = useState({
    author: '',
    message: '',
    dateFrom: '',
    dateTo: '',
    branch: ''
  })

  const handleSearch = () => {
    // Construir query de git log con --grep, --author, etc.
    const query = buildGitLogQuery(filters)
    onSearch(query)
  }

  return (
    <div className="space-y-3 p-4 bg-slate-800 rounded-lg">
      <input 
        placeholder="Buscar en mensaje..."
        onChange={e => setFilters({...filters, message: e.target.value})}
        className="w-full bg-slate-700 rounded px-3 py-2"
      />
      <input 
        placeholder="Buscar por autor..."
        onChange={e => setFilters({...filters, author: e.target.value})}
        className="w-full bg-slate-700 rounded px-3 py-2"
      />
      <div className="flex gap-2">
        <input type="date" onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
        <input type="date" onChange={e => setFilters({...filters, dateTo: e.target.value})} />
      </div>
      <button onClick={handleSearch} className="w-full bg-brand-500 hover:bg-brand-600 rounded-lg py-2">
        Buscar
      </button>
    </div>
  )
}
```

---

## 3. Git Blame

Ver quién modificó cada línea de código.

**Interfaz del Blame:**
```jsx
// src/components/FileBlame.jsx
function FileBlame({ filePath, folderPath }) {
  const [blame, setBlame] = useState([])
  
  useEffect(() => {
    loadBlame()
  }, [filePath])

  const loadBlame = async () => {
    if (!window.electronAPI) return
    const data = await window.electronAPI.gitBlame(folderPath, filePath)
    setBlame(data)
  }

  return (
    <div className="font-mono text-xs">
      {blame.map((line, i) => (
        <div key={i} className="flex border-b border-slate-700 hover:bg-slate-700/50">
          <div className="w-32 bg-slate-800 px-2 py-1 text-slate-400 flex-shrink-0">
            <span className="text-xs">{line.author}</span>
            <span className="ml-2">{line.date}</span>
          </div>
          <div className="flex-1 px-3 py-1 text-slate-200">
            {line.code}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Electron API:**
```javascript
ipcMain.handle('git-blame', async (event, path, file) => {
  const git = simpleGit(path)
  const blame = await git.blame(file)
  return blame
})
```

---

## 4. Historial de Archivos

Ver todas las versiones y cambios de un archivo específico.

**Componente FileHistory:**
```jsx
// src/components/FileHistory.jsx
function FileHistory({ filePath, folderPath }) {
  const [history, setHistory] = useState([])

  const handleViewVersion = async (commitId) => {
    const content = await window.electronAPI.getFileAtCommit(folderPath, filePath, commitId)
    // Mostrar contenido en modal o panel lateral
  }

  const handleDiffWithPrevious = async (commitId) => {
    const diff = await window.electronAPI.getFileDiff(folderPath, filePath, commitId)
    // Mostrar diff visual
  }

  return (
    <div className="space-y-2">
      {history.map(entry => (
        <div key={entry.hash} className="p-3 bg-slate-800 rounded-lg flex justify-between">
          <div>
            <p className="font-mono text-sm">{entry.hash.substring(0, 7)}</p>
            <p className="text-xs text-slate-400">{entry.author} - {entry.date}</p>
            <p className="text-sm">{entry.message}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleViewVersion(entry.hash)} className="text-xs px-2 py-1 bg-slate-700 rounded">
              Ver
            </button>
            <button onClick={() => handleDiffWithPrevious(entry.hash)} className="text-xs px-2 py-1 bg-slate-700 rounded">
              Diff
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Electron API:**
```javascript
ipcMain.handle('get-file-at-commit', async (event, path, file, commitId) => {
  const git = simpleGit(path)
  return await git.show([`${commitId}:${file}`])
})

ipcMain.handle('get-file-diff', async (event, path, file, commitId) => {
  const git = simpleGit(path)
  return await git.diff([`${commitId}~1..${commitId}`, '--', file])
})
```

---

*Nota: La visualización de gráficos requeriría integrar librerías como Chart.js o Recharts.*
