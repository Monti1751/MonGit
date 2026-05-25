# UX Mejorada

**Ubicación esperada:** Disperso en varios componentes
**Contexto:** Mejoras de experiencia de usuario para mayor accesibilidad y productividad.

---

## 1. Light Mode

Tema claro como alternativa al tema oscuro.

**Implementación:**
```jsx
// src/themes/light.css
:root[data-theme='light'] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --brand-color: #0ea5e9;
  --brand-light: #38bdf8;
  --brand-dark: #0284c7;
  --border-color: #d1d5db;
}

:root[data-theme='dark'] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  /* ... */
}
```

**Componente ThemeToggle:**
```jsx
// src/components/ThemeToggle.jsx
function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('mongit-theme', newTheme)
  }

  return (
    <button
      onClick={handleToggleTheme}
      className="p-2 hover:bg-slate-700 rounded-lg transition"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
```

---

## 2. Command Palette

Búsqueda rápida de comandos con Ctrl+K.

**Componente CommandPalette:**
```jsx
// src/components/CommandPalette.jsx
const COMMANDS = [
  { id: 'sync', label: 'Sincronizar (Pull & Push)', action: 'sync', keys: 'Ctrl+Shift+S' },
  { id: 'commit', label: 'Crear commit', action: 'commit', keys: 'Ctrl+Shift+C' },
  { id: 'newBranch', label: 'Nueva rama', action: 'new-branch', keys: 'Ctrl+B' },
  { id: 'switchBranch', label: 'Cambiar rama', action: 'switch-branch', keys: 'Ctrl+Shift+B' },
  { id: 'stash', label: 'Guardar cambios (Stash)', action: 'stash' },
  { id: 'openSettings', label: 'Abrir configuración', action: 'settings' },
  { id: 'help', label: 'Ayuda y atajos', action: 'help' }
]

export default function CommandPalette({ isOpen, onClose, onCommand }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const filtered = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onClose() // Toggle
      }
      if (isOpen && e.key === 'ArrowDown') {
        setSelected(prev => (prev + 1) % filtered.length)
      }
      if (isOpen && e.key === 'ArrowUp') {
        setSelected(prev => (prev - 1 + filtered.length) % filtered.length)
      }
      if (isOpen && e.key === 'Enter') {
        onCommand(filtered[selected].action)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filtered, selected])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          <input
            autoFocus
            type="text"
            placeholder="Buscar comando..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent px-4 py-3 text-white placeholder-slate-500 focus:outline-none border-b border-slate-700"
          />
          <div className="max-h-96 overflow-y-auto">
            {filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => {
                  onCommand(cmd.action)
                  onClose()
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition ${
                  i === selected
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{cmd.label}</span>
                <span className="text-xs text-slate-500">{cmd.keys}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 3. Versión Web

Acceso remoto a MonGit desde el navegador.

```javascript
// electron/web-server.js
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

// API endpoints para la versión web
app.get('/api/repos/:path', (req, res) => {
  // Retornar información del repositorio
})

app.post('/api/repos/:path/pull', (req, res) => {
  // Ejecutar git pull
})

app.post('/api/repos/:path/push', (req, res) => {
  // Ejecutar git push
})

app.get('/api/repos/:path/log', (req, res) => {
  // Retornar histórico de commits
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Web server running on http://localhost:${PORT}`)
})
```

---

## 4. Cloud Sync

Sincronizar preferencias entre dispositivos.

**Implementación:**
```jsx
// src/services/cloudSync.js
export async function syncPreferences() {
  const prefs = {
    theme: localStorage.getItem('mongit-theme'),
    shortcuts: localStorage.getItem('mongit-shortcuts'),
    repos: localStorage.getItem('mongit-workspaces'),
    settings: localStorage.getItem('mongit-settings')
  }

  try {
    // Guardar en servidor (requiere backend)
    await fetch('https://cloud.mongit.dev/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(prefs)
    })
    setSuccess('✓ Preferencias sincronizadas')
  } catch (err) {
    console.error('Cloud sync error:', err)
  }
}

export async function restorePreferences() {
  try {
    const response = await fetch('https://cloud.mongit.dev/api/sync', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const prefs = await response.json()

    Object.entries(prefs).forEach(([key, value]) => {
      localStorage.setItem(`mongit-${key}`, value)
    })
  } catch (err) {
    console.error('Cloud restore error:', err)
  }
}
```

---

## 5. Notificaciones del Sistema

Pop-ups del SO para eventos importantes.

```javascript
// electron/notifications.js
const { Notification } = require('electron')

ipcMain.on('show-notification', (event, { title, body, icon }) => {
  new Notification({
    title,
    body,
    icon: path.join(__dirname, '../assets/icon.png')
  }).show()
})
```

---

## 6. Búsqueda Global

Buscar commits, archivos, ramas en todo el repositorio.

```jsx
// src/components/GlobalSearch.jsx
function GlobalSearch({ folderPath }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({
    commits: [],
    branches: [],
    files: [],
    tags: []
  })

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery)
    
    const foundCommits = await window.electronAPI.searchCommits(folderPath, searchQuery)
    const foundBranches = await window.electronAPI.searchBranches(folderPath, searchQuery)
    const foundFiles = await window.electronAPI.searchFiles(folderPath, searchQuery)
    const foundTags = await window.electronAPI.searchTags(folderPath, searchQuery)

    setResults({ commits: foundCommits, branches: foundBranches, files: foundFiles, tags: foundTags })
  }

  return (
    <div className="space-y-3">
      <input
        placeholder="Buscar en todo..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
      />
      {/* Mostrar resultados agrupados */}
    </div>
  )
}
```

---

*Nota: Light mode requiere variables CSS; web version requiere un backend simple; cloud sync requiere infraestructura en la nube.*
