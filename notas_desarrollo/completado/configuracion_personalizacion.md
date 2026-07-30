# Configuración y Personalización

**Ubicación esperada:** `src/components/SettingsPanel.jsx`, `src/components/GitHooksEditor.jsx` (nuevos componentes)
**Contexto:** Panel de configuración global y local de MonGit.

---

## 1. Settings del Repositorio

Configuración de reglas de merge y protección de ramas.

**Componente RepoSettings:**
```jsx
// src/components/RepoSettings.jsx
export default function RepoSettings({ folderPath }) {
  const [settings, setSettings] = useState({
    defaultBranch: 'main',
    requirePRReviews: false,
    requiredReviews: 1,
    dismissStaleReviews: false,
    requireStatusChecks: true,
    restrictWhoCanPush: false,
    allowDeletion: true,
    autoDeleteBranch: false
  })

  const handleSave = async () => {
    await window.electronAPI.saveRepoSettings(folderPath, settings)
    setSuccess('✓ Configuración guardada')
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-white">Configuración del Repositorio</h3>

      <div>
        <label className="text-xs font-semibold text-slate-400 block mb-1.5">
          Rama por defecto
        </label>
        <select
          value={settings.defaultBranch}
          onChange={e => setSettings({ ...settings, defaultBranch: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option>main</option>
          <option>master</option>
          <option>develop</option>
        </select>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.requirePRReviews}
            onChange={e => setSettings({ ...settings, requirePRReviews: e.target.checked })}
            className="w-4 h-4"
          />
          Requerir reviews en PRs
        </label>

        {settings.requirePRReviews && (
          <div className="ml-6">
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Número de reviews requeridas
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.requiredReviews}
              onChange={e => setSettings({ ...settings, requiredReviews: parseInt(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.requireStatusChecks}
            onChange={e => setSettings({ ...settings, requireStatusChecks: e.target.checked })}
            className="w-4 h-4"
          />
          Requerir que pasen los checks de CI/CD
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.autoDeleteBranch}
            onChange={e => setSettings({ ...settings, autoDeleteBranch: e.target.checked })}
            className="w-4 h-4"
          />
          Eliminar ramas automáticamente después de merge
        </label>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-brand-500 hover:bg-brand-600 rounded-lg py-2 font-medium"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
```

---

## 2. Git Hooks Editor

Editor visual para pre-commit, commit-msg, post-commit, etc.

**Componente GitHooksEditor:**
```jsx
// src/components/GitHooksEditor.jsx
export default function GitHooksEditor({ folderPath }) {
  const [hooks, setHooks] = useState({
    'pre-commit': '',
    'commit-msg': '',
    'post-commit': '',
    'pre-push': ''
  })
  const [selectedHook, setSelectedHook] = useState('pre-commit')

  useEffect(() => {
    loadHooks()
  }, [folderPath])

  const loadHooks = async () => {
    const hooksData = await window.electronAPI.getGitHooks(folderPath)
    setHooks(hooksData)
  }

  const handleSaveHook = async (hookName, content) => {
    await window.electronAPI.saveGitHook(folderPath, hookName, content)
    setSuccess(`✓ Hook ${hookName} guardado`)
  }

  return (
    <div className="flex gap-4 p-4 h-[600px]">
      <div className="flex-shrink-0 w-40 space-y-2">
        {Object.keys(hooks).map(hookName => (
          <button
            key={hookName}
            onClick={() => setSelectedHook(hookName)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
              selectedHook === hookName
                ? 'bg-brand-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {hookName}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-3">
        <div className="text-xs text-slate-400 p-3 bg-slate-800 rounded-lg">
          <p className="font-semibold mb-1">Documentación:</p>
          <HookDocumentation hookName={selectedHook} />
        </div>

        <textarea
          value={hooks[selectedHook]}
          onChange={e => setHooks({ ...hooks, [selectedHook]: e.target.value })}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:border-brand-500"
          placeholder={`#!/bin/bash\n# Escribe tu script aquí`}
        />

        <button
          onClick={() => handleSaveHook(selectedHook, hooks[selectedHook])}
          className="bg-brand-500 hover:bg-brand-600 rounded-lg py-2 font-medium"
        >
          Guardar Hook
        </button>
      </div>
    </div>
  )
}
```

---

## 3. Temas Personalizados

Más opciones de personalización visual (colores, tipografía, efectos).

**Componente ThemeSelector:**
```jsx
// src/components/ThemeSelector.jsx
const THEMES = [
  {
    id: 'dark-default',
    name: 'Dark (Default)',
    colors: { primary: '#14b8a6', bg: '#0f172a' }
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    colors: { primary: '#ec4899', bg: '#0f0a1a' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: { primary: '#0ea5e9', bg: '#001a33' }
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: { primary: '#22c55e', bg: '#0a1a0a' }
  }
]

function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('dark-default')

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId)
    localStorage.setItem('mongit-theme', themeId)
    applyTheme(THEMES.find(t => t.id === themeId))
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Tema</h3>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`p-4 rounded-lg border-2 transition ${
              currentTheme === theme.id
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-slate-600 bg-slate-800 hover:border-slate-500'
            }`}
          >
            <div className="text-xs font-medium text-white">{theme.name}</div>
            <div className="mt-2 flex gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.bg }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 4. Atajos de Teclado Personalizados

Mapeo de atajos de teclado configurables.

```jsx
// src/components/KeyboardShortcuts.jsx
const DEFAULT_SHORTCUTS = {
  'sync': { keys: ['Ctrl', 'Shift', 'S'], description: 'Sincronizar (Pull & Push)' },
  'commit': { keys: ['Ctrl', 'Shift', 'C'], description: 'Crear commit' },
  'newBranch': { keys: ['Ctrl', 'B'], description: 'Nueva rama' },
  'switchBranch': { keys: ['Ctrl', 'Shift', 'B'], description: 'Cambiar rama' },
  'search': { keys: ['Ctrl', 'K'], description: 'Buscar' },
}

export default function KeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS)
  const [editing, setEditing] = useState(null)

  const handleEditShortcut = (action) => {
    setEditing(action)
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Atajos de Teclado</h3>
      {Object.entries(shortcuts).map(([action, shortcut]) => (
        <div key={action} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm font-medium text-white">{shortcut.description}</p>
            <p className="text-xs text-slate-400">{action}</p>
          </div>
          <div className="flex gap-1">
            {shortcut.keys.map(key => (
              <span key={key} className="px-2 py-1 bg-slate-700 rounded text-xs font-mono text-slate-200">
                {key}
              </span>
            ))}
          </div>
          <button
            onClick={() => handleEditShortcut(action)}
            className="text-xs px-2 py-1 hover:bg-slate-700 rounded"
          >
            Editar
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

*Nota: La configuración debe guardarse en `~/.mongit/config.json` o usar Electron's `userData` directory.*
