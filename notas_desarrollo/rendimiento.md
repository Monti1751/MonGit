# Optimización de Rendimiento

**Ubicación esperada:** `src/hooks/useVirtualization.js`, `electron/performance.js` (nuevos módulos)
**Contexto:** Mejoras para manejar repositorios grandes sin ralentizaciones.

---

## 1. Virtualización de Listas

Renderizar solo items visibles en listas largas.

**Instalación:**
```bash
npm install react-window
```

**Componente VirtualizedCommitList:**
```jsx
// src/components/VirtualizedCommitList.jsx
import { FixedSizeList as List } from 'react-window'

export default function VirtualizedCommitList({ commits, onSelectCommit }) {
  const Row = ({ index, style }) => (
    <div style={style} className="px-4 py-2 border-b border-slate-700">
      <CommitCard
        commit={commits[index]}
        onClick={() => onSelectCommit(commits[index])}
      />
    </div>
  )

  return (
    <List
      height={600}
      itemCount={commits.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

---

## 2. Caché Local

Almacenar datos en caché para evitar recalculos.

**Hook useRepoCache:**
```jsx
// src/hooks/useRepoCache.js
export function useRepoCache(folderPath) {
  const [cache, setCache] = useState({})
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  const getCachedData = async (key, fetcher) => {
    const cached = cache[key]
    
    // Si está en caché y no expiró, retornar
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    // Si no, fetchear y cachear
    const data = await fetcher()
    setCache(prev => ({
      ...prev,
      [key]: { data, timestamp: Date.now() }
    }))
    return data
  }

  const invalidateCache = (key) => {
    setCache(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
  }

  return { getCachedData, invalidateCache, cache }
}

// Uso:
const { getCachedData, invalidateCache } = useRepoCache(folderPath)

const commits = await getCachedData('commits', () =>
  window.electronAPI.getCommitLog(folderPath)
)
```

---

## 3. Worker Threads

Ejecutar operaciones Git en background sin bloquear UI.

**Configuración:**
```javascript
// electron/workers/git-worker.js
const { parentPort } = require('worker_threads')
const simpleGit = require('simple-git')

parentPort.on('message', async (task) => {
  try {
    const git = simpleGit(task.path)
    let result

    switch (task.operation) {
      case 'log':
        result = await git.log()
        break
      case 'diff':
        result = await git.diff(task.args)
        break
      case 'status':
        result = await git.status()
        break
      default:
        result = null
    }

    parentPort.postMessage({ success: true, result, taskId: task.id })
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message, taskId: task.id })
  }
})
```

**Hook useGitWorker:**
```jsx
// src/hooks/useGitWorker.js
export function useGitWorker() {
  const [worker] = useState(() => {
    return window.electronAPI.createGitWorker?.()
  })

  const executeGitTask = (operation, path, args = []) => {
    return new Promise((resolve, reject) => {
      if (!worker) {
        // Fallback a ejecución en main thread
        window.electronAPI[operation](path, ...args).then(resolve).catch(reject)
        return
      }

      const taskId = Math.random()
      const timeout = setTimeout(() => {
        reject(new Error('Git operation timeout'))
      }, 30000)

      const handleMessage = (event) => {
        if (event.data.taskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', handleMessage)
          
          if (event.data.success) {
            resolve(event.data.result)
          } else {
            reject(new Error(event.data.error))
          }
        }
      }

      worker.addEventListener('message', handleMessage)
      worker.postMessage({ taskId, operation, path, args })
    })
  }

  return { executeGitTask }
}
```

---

## 4. Lazy Loading

Cargar datos bajo demanda, no todo al inicio.

**Componente LazyPanel:**
```jsx
// src/components/LazyPanel.jsx
export default function LazyPanel({ title, loader, threshold = 0.1 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !data && !loading) {
          setLoading(true)
          const result = await loader()
          setData(result)
          setLoading(false)
        }
      },
      { threshold }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [data, loading, loader])

  return (
    <div ref={ref} className="p-4 bg-slate-800 rounded-lg">
      <h3 className="font-semibold text-white mb-3">{title}</h3>
      {loading && <p className="text-slate-400">Cargando...</p>}
      {data && <div>{/* Renderizar datos */}</div>}
      {!data && !loading && <div className="h-32 bg-slate-700 rounded animate-pulse" />}
    </div>
  )
}
```

---

## 5. Memoización Inteligente

Evitar re-renders innecesarios.

```jsx
// src/components/MemoizedCommitCard.jsx
const CommitCard = React.memo(({ commit, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(commit)}
      className="w-full text-left p-3 hover:bg-slate-700 rounded-lg transition"
    >
      <p className="font-mono text-sm">{commit.hash.substring(0, 7)}</p>
      <p className="text-xs text-slate-400">{commit.message}</p>
    </button>
  )
}, (prev, next) => {
  // Comparación personalizada para memoización
  return prev.commit.hash === next.commit.hash &&
         prev.onSelect === next.onSelect
})

export default MemoizedCommitCard
```

---

## 6. Compression de Datos

Comprimir datos grandes antes de enviarlops.

```javascript
// electron/compression.js
const zlib = require('zlib')

ipcMain.handle('compress-data', (event, data) => {
  return new Promise((resolve, reject) => {
    zlib.gzip(JSON.stringify(data), (err, compressed) => {
      if (err) reject(err)
      else resolve(compressed.toString('base64'))
    })
  })
})

ipcMain.handle('decompress-data', (event, compressed) => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(Buffer.from(compressed, 'base64'), (err, decompressed) => {
      if (err) reject(err)
      else resolve(JSON.parse(decompressed.toString()))
    })
  })
})
```

---

## 7. Metrics y Profiling

Monitorear rendimiento de la app.

```jsx
// src/services/performance-monitor.js
export class PerformanceMonitor {
  static measureOperation(name, fn) {
    const start = performance.now()
    const result = fn()
    const duration = performance.now() - start

    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)

    // Enviar a analytics si toma más de 1 segundo
    if (duration > 1000) {
      window.electronAPI?.reportSlowOperation?.(name, duration)
    }

    return result
  }

  static async measureAsync(name, fn) {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start

    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)

    if (duration > 1000) {
      window.electronAPI?.reportSlowOperation?.(name, duration)
    }

    return result
  }
}

// Uso:
const commits = await PerformanceMonitor.measureAsync('Load commits', () =>
  window.electronAPI.getCommitLog(folderPath)
)
```

---

## 8. Estrategia de Caché Agresiva

Caché para operaciones frecuentes con invalidación smart.

```jsx
// src/hooks/useSmartCache.js
export function useSmartCache(dependencyKey, fetcher, dependencies = []) {
  const [data, setData] = useState(null)
  const cacheRef = useRef({})

  useEffect(() => {
    // Si está en caché, usar inmediatamente
    if (cacheRef.current[dependencyKey]) {
      setData(cacheRef.current[dependencyKey])
      return
    }

    // Si no, fetchear y cachear
    let cancelled = false
    fetcher().then(result => {
      if (!cancelled) {
        cacheRef.current[dependencyKey] = result
        setData(result)
      }
    })

    return () => { cancelled = true }
  }, [dependencyKey, fetcher])

  return data
}
```

---

## Recomendaciones Generales

1. **Usar devtools de React**: Identificar renders innecesarios
2. **Code splitting**: Dividir el bundle en chunks
3. **Lazy load de componentes**: `React.lazy()` + `Suspense`
4. **Monitorear memory leaks**: DevTools de Electron
5. **Batch updates**: Agrupar updates de estado
6. **Debounce/Throttle**: En operaciones frecuentes (búsqueda, scroll)

---

*Nota: Medir siempre con DevTools; la optimización prematura es enemiga del desarrollo.*
