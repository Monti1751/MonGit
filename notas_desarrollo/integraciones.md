# Integraciones Externas

**Ubicación esperada:** `src/integrations/` (nueva carpeta)
**Contexto:** Conectar MonGit con servicios externos para notificaciones y automatización.

---

## 1. Webhooks

Recibir notificaciones de eventos del repositorio.

```javascript
// electron/webhooks.js
const express = require('express')
const app = express()

ipcMain.handle('start-webhook-server', (event, port = 3000) => {
  app.use(express.json())

  app.post('/webhook/github', (req, res) => {
    const event = req.headers['x-github-event']
    const payload = req.body

    // Enviar notificación a la ventana
    mainWindow.webContents.send('webhook-event', {
      provider: 'github',
      event,
      payload
    })

    res.status(200).send('OK')
  })

  app.post('/webhook/gitlab', (req, res) => {
    const event = req.headers['x-gitlab-event']
    const payload = req.body

    mainWindow.webContents.send('webhook-event', {
      provider: 'gitlab',
      event,
      payload
    })

    res.status(200).send('OK')
  })

  app.listen(port, () => {
    console.log(`Webhook server running on port ${port}`)
  })
})
```

**Frontend:**
```jsx
// src/hooks/useWebhooks.js
export function useWebhooks() {
  useEffect(() => {
    if (!window.electronAPI) return

    const handleWebhookEvent = (event, data) => {
      console.log('Webhook event:', data)
      
      if (data.event === 'push') {
        // Mostrar notificación de push
        showNotification(`Push en ${data.payload.repository.name}`)
      } else if (data.event === 'pull_request') {
        // Notificación de PR
        showNotification(`PR creado: ${data.payload.pull_request.title}`)
      }
    }

    window.electronAPI.onWebhookEvent(handleWebhookEvent)
  }, [])
}
```

---

## 2. GitHub Actions / GitLab CI Status

Ver estado de CI/CD pipelines.

**Componente CIPipelineStatus:**
```jsx
// src/components/CIPipelineStatus.jsx
export default function CIPipelineStatus({ repo, provider }) {
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPipelines()
    // Poll cada 30 segundos
    const interval = setInterval(loadPipelines, 30000)
    return () => clearInterval(interval)
  }, [repo])

  const loadPipelines = async () => {
    setLoading(true)
    try {
      if (provider === 'github') {
        const workflows = await window.electronAPI.getGitHubWorkflows(repo)
        setPipelines(workflows)
      } else if (provider === 'gitlab') {
        const pipelines = await window.electronAPI.getGitLabPipelines(repo)
        setPipelines(pipelines)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        {loading && <RefreshCw size={14} className="animate-spin" />}
        CI/CD Pipelines
      </h3>
      {pipelines.map(pipeline => (
        <div key={pipeline.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm font-medium text-white">{pipeline.name}</p>
            <p className="text-xs text-slate-400">{pipeline.branch}</p>
          </div>
          <div className="flex items-center gap-2">
            {pipeline.status === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
            {pipeline.status === 'failed' && <AlertCircle size={16} className="text-rose-400" />}
            {pipeline.status === 'running' && <RefreshCw size={16} className="text-indigo-400 animate-spin" />}
            <a href={pipeline.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:underline">
              Ver
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## 3. Integraciones Externas (Slack, Discord)

Enviar notificaciones a canales externos.

**Componente NotificationIntegrations:**
```jsx
// src/components/NotificationIntegrations.jsx
const INTEGRATIONS = {
  slack: {
    name: 'Slack',
    icon: '💬',
    events: ['push', 'pr', 'merge', 'issue']
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    events: ['push', 'pr', 'merge', 'issue']
  },
  email: {
    name: 'Email',
    icon: '📧',
    events: ['push', 'pr', 'merge', 'issue']
  }
}

export default function NotificationIntegrations() {
  const [integrations, setIntegrations] = useState({})
  const [showSetup, setShowSetup] = useState(null)

  const handleSetupIntegration = async (integrationName, webhookUrl) => {
    try {
      await window.electronAPI.setupNotificationIntegration(integrationName, webhookUrl)
      setIntegrations(prev => ({
        ...prev,
        [integrationName]: { enabled: true, webhookUrl }
      }))
      setSuccess(`✓ ${integrationName} configurado`)
    } catch (err) {
      setError('Error configurando integración: ' + err.message)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-white">Integraciones de Notificaciones</h3>

      {Object.entries(INTEGRATIONS).map(([key, integration]) => (
        <div key={key} className="bg-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{integration.icon} {integration.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                Eventos: {integration.events.join(', ')}
              </p>
            </div>
            <button
              onClick={() => setShowSetup(key)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                integrations[key]?.enabled
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {integrations[key]?.enabled ? '✓ Configurado' : 'Configurar'}
            </button>
          </div>

          {showSetup === key && (
            <IntegrationSetupForm
              integration={integration}
              onSave={(url) => handleSetupIntegration(key, url)}
              onClose={() => setShowSetup(null)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 4. Automatización

Ejecutar scripts personalizados en ciertos eventos.

```jsx
// src/components/Automation.jsx
const AUTOMATION_EVENTS = ['post-commit', 'post-merge', 'post-push', 'on-branch-switch']

function AutomationRules() {
  const [rules, setRules] = useState([])

  const handleAddRule = async (trigger, script) => {
    const newRule = {
      id: crypto.randomUUID(),
      trigger,
      script,
      enabled: true
    }
    
    await window.electronAPI.saveAutomationRule(newRule)
    setRules([...rules, newRule])
    setSuccess('✓ Regla de automatización guardada')
  }

  return (
    <div className="space-y-4 p-4">
      <button className="w-full bg-brand-500 rounded-lg py-2 text-sm font-medium">
        + Nueva Regla
      </button>

      {rules.map(rule => (
        <div key={rule.id} className="bg-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-white">{rule.trigger}</p>
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={e => {
                const updated = { ...rule, enabled: e.target.checked }
                setRules(rules.map(r => r.id === rule.id ? updated : r))
              }}
              className="w-4 h-4"
            />
          </div>
          <code className="text-xs bg-slate-900 p-2 rounded block text-slate-300">
            {rule.script}
          </code>
        </div>
      ))}
    </div>
  )
}
```

---

*Nota: Para Slack/Discord, requiere crear una app en sus respectivas plataformas y obtener webhooks.*
