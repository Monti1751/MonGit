import React, { useState, useEffect } from 'react'
import {
  Globe, Server, Terminal, Settings, Bell, RefreshCw, Plus, Trash2, Send,
  Play, AlertTriangle, CheckCircle2, ChevronRight, Activity, Shield, Copy, Check
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function IntegrationsPanel({
  folderPath,
  providers,
  showToast
}) {
  const { t } = useTranslation()
  const [activeSubTab, setActiveSubTab] = useState('webhooks')

  // --- Webhooks State ---
  const [webhookPort, setWebhookPort] = useState(3000)
  const [isServerRunning, setIsServerRunning] = useState(false)
  const [enableNotifications, setEnableNotifications] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState([])
  const [copiedType, setCopiedType] = useState(null) // 'github' or 'gitlab'

  // --- Notifications State ---
  const [integrationsConfig, setIntegrationsConfig] = useState({
    slack: { url: '', events: ['Push', 'Merge'] },
    discord: { url: '', events: ['Push', 'Pull Request', 'Issue Created', 'Merge'] }
  })
  const [testLoading, setTestLoading] = useState({ slack: false, discord: false })

  // --- Automation State ---
  const [automationRules, setAutomationRules] = useState([])
  const [executionLogs, setExecutionLogs] = useState([])
  const [newRule, setNewRule] = useState({ name: '', trigger: 'post-commit', command: '', enabled: true })
  const [expandedLogId, setExpandedLogId] = useState(null)

  // --- Initialize on Mount ---
  useEffect(() => {
    // 1. Check Webhook Server Status
    checkWebhookStatus()

    // 2. Load Notifications Settings
    const savedConfig = localStorage.getItem('mongit_integrations_v1')
    if (savedConfig) {
      try {
        setIntegrationsConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.error('Error parsing integrations config', e)
      }
    }

    // 3. Load Webhook notifications toggle
    const savedNotify = localStorage.getItem('mongit_webhook_notifications_enabled') === 'true'
    setEnableNotifications(savedNotify)

    // 4. Load Webhook Event History
    const savedEvents = localStorage.getItem('mongit_webhook_events_v1')
    if (savedEvents) {
      try {
        setWebhookEvents(JSON.parse(savedEvents))
      } catch (e) {
        console.error('Error parsing webhook events', e)
      }
    }

    // 5. Load Automation Rules
    const savedRules = localStorage.getItem('mongit_automation_rules_v1')
    if (savedRules) {
      try {
        setAutomationRules(JSON.parse(savedRules))
      } catch (e) {
        console.error('Error parsing automation rules', e)
      }
    }

    // 6. Load Automation Logs
    const savedLogs = localStorage.getItem('mongit_automation_logs_v1')
    if (savedLogs) {
      try {
        setExecutionLogs(JSON.parse(savedLogs))
      } catch (e) {
        console.error('Error parsing execution logs', e)
      }
    }
  }, [])

  // --- Webhook Events Listener Effect ---
  useEffect(() => {
    if (!window.electronAPI?.onWebhookEvent) return

    const unsubscribe = window.electronAPI.onWebhookEvent((data) => {
      const briefInfo = getWebhookBriefInfo(data)
      const newEvent = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        provider: data.provider,
        event: data.event,
        info: briefInfo
      }

      setWebhookEvents(prev => {
        const updated = [newEvent, ...prev].slice(0, 50)
        localStorage.setItem('mongit_webhook_events_v1', JSON.stringify(updated))
        return updated
      })

      // Desktop HTML5 notifications if enabled
      const notifyEnabled = localStorage.getItem('mongit_webhook_notifications_enabled') === 'true'
      if (notifyEnabled) {
        const title = t('integrations.webhooks.notificationTitle', 'MonGit Webhook')
        const body = `${data.provider.toUpperCase()} [${data.event}]: ${briefInfo}`
        
        if (Notification.permission === 'granted') {
          new Notification(title, { body })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body })
            }
          })
        }
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [t])

  // --- Git Action Events (Automation Rules execution) ---
  useEffect(() => {
    const handleGitEvent = async (e) => {
      const { eventType, folderPath: eventFolderPath } = e.detail
      if (eventFolderPath !== folderPath) return

      // Reload fresh rules from localStorage
      const savedRules = localStorage.getItem('mongit_automation_rules_v1')
      let rules = []
      if (savedRules) {
        try {
          rules = JSON.parse(savedRules)
        } catch (err) {
          console.error(err)
        }
      }

      // Filter enabled rules matching eventType
      const matchingRules = rules.filter(r => r.trigger === eventType && r.enabled)

      for (const rule of matchingRules) {
        const logId = Math.random().toString(36).substring(7)
        const newLog = {
          id: logId,
          ruleName: rule.name,
          script: rule.command,
          trigger: rule.trigger,
          status: 'running',
          timestamp: new Date().toLocaleString(),
          stdout: '',
          stderr: ''
        }

        setExecutionLogs(prev => {
          const updated = [newLog, ...prev].slice(0, 20)
          localStorage.setItem('mongit_automation_logs_v1', JSON.stringify(updated))
          return updated
        })

        try {
          const result = await window.electronAPI.runAutomationScript(folderPath, rule.command)
          setExecutionLogs(prev => {
            const updated = prev.map(log => {
              if (log.id === logId) {
                return {
                  ...log,
                  status: result.success ? 'success' : 'failed',
                  stdout: result.stdout || '',
                  stderr: result.stderr || result.error || ''
                }
              }
              return log
            })
            localStorage.setItem('mongit_automation_logs_v1', JSON.stringify(updated))
            return updated
          })
        } catch (err) {
          setExecutionLogs(prev => {
            const updated = prev.map(log => {
              if (log.id === logId) {
                return {
                  ...log,
                  status: 'failed',
                  stderr: err.message || 'Unknown execution error'
                }
              }
              return log
            })
            localStorage.setItem('mongit_automation_logs_v1', JSON.stringify(updated))
            return updated
          })
        }
      }

      // Send to Slack / Discord
      const savedIntegrations = localStorage.getItem('mongit_integrations_v1')
      if (savedIntegrations) {
        try {
          const integrations = JSON.parse(savedIntegrations)
          let mappedEventName = null
          if (eventType === 'post-push') mappedEventName = 'Push'
          else if (eventType === 'post-commit') mappedEventName = 'Push'
          else if (eventType === 'post-pull') mappedEventName = 'Pull Request'
          else if (eventType === 'pull-request') mappedEventName = 'Pull Request'
          else if (eventType === 'issue-created') mappedEventName = 'Issue Created'
          else if (eventType === 'post-merge') mappedEventName = 'Merge'

          if (mappedEventName) {
            const repoName = folderPath.split(/[\\/]/).pop()
            const message = `[MonGit] Event trigger: **${mappedEventName}** in repository \`${repoName}\` (${folderPath})`

            if (integrations.slack?.url && integrations.slack.events?.includes(mappedEventName)) {
              window.electronAPI.sendExternalNotification(integrations.slack.url, message).catch(console.error)
            }
            if (integrations.discord?.url && integrations.discord.events?.includes(mappedEventName)) {
              window.electronAPI.sendExternalNotification(integrations.discord.url, message).catch(console.error)
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
    }

    window.addEventListener('mongit-git-event', handleGitEvent)
    return () => window.removeEventListener('mongit-git-event', handleGitEvent)
  }, [folderPath])

  // --- Webhooks Helper Functions ---
  const checkWebhookStatus = async () => {
    if (!window.electronAPI?.getWebhookServerStatus) return
    try {
      const res = await window.electronAPI.getWebhookServerStatus()
      setIsServerRunning(res.running)
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartWebhookServer = async () => {
    if (!window.electronAPI?.startWebhookServer) return
    try {
      const result = await window.electronAPI.startWebhookServer(Number(webhookPort))
      if (result.success) {
        setIsServerRunning(true)
        showToast(`${t('integrations.webhooks.running', 'Server Listening on port')} ${webhookPort}`, 'success')
      } else {
        showToast(result.error || 'Failed to start webhook server', 'error')
      }
    } catch (e) {
      showToast(e.message || 'Error starting server', 'error')
    }
  }

  const handleStopWebhookServer = async () => {
    if (!window.electronAPI?.stopWebhookServer) return
    try {
      const result = await window.electronAPI.stopWebhookServer()
      if (result.success) {
        setIsServerRunning(false)
        showToast(t('integrations.webhooks.stopped', 'Server Stopped'), 'info')
      }
    } catch (e) {
      showToast(e.message || 'Error stopping server', 'error')
    }
  }

  const handleNotificationToggle = (e) => {
    const checked = e.target.checked
    setEnableNotifications(checked)
    localStorage.setItem('mongit_webhook_notifications_enabled', checked ? 'true' : 'false')
    if (checked && Notification.permission !== 'granted') {
      Notification.requestPermission()
    }
  }

  const getWebhookBriefInfo = (data) => {
    const { provider, event, payload } = data
    if (!payload) return 'No payload data'

    if (provider === 'github') {
      const repoName = payload.repository?.name || 'unknown-repo'
      if (event === 'push') {
        const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'unknown-branch'
        const commitMsg = payload.head_commit?.message || (payload.commits && payload.commits[0]?.message) || ''
        return `${repoName} (${branch}): ${commitMsg}`
      }
      if (event === 'ping') {
        return `Ping connection check on ${repoName}`
      }
      return `${event} event on ${repoName}`
    }

    if (provider === 'gitlab') {
      const repoName = payload.project?.name || 'unknown-project'
      if (event === 'Push Hook') {
        const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'unknown-branch'
        const commitMsg = (payload.commits && payload.commits[0]?.message) || ''
        return `${repoName} (${branch}): ${commitMsg}`
      }
      return `${event} event on ${repoName}`
    }

    return `Webhook event details received`
  }

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  const clearWebhookHistory = () => {
    setWebhookEvents([])
    localStorage.removeItem('mongit_webhook_events_v1')
  }

  // --- Notifications Helper Functions ---
  const handleSaveIntegration = (providerName) => {
    const updated = { ...integrationsConfig }
    localStorage.setItem('mongit_integrations_v1', JSON.stringify(updated))
    showToast(t('integrations.successSaved', 'Configuration saved successfully'), 'success')
  }

  const handleTestIntegration = async (providerName) => {
    const config = integrationsConfig[providerName]
    if (!config.url) {
      showToast('Please enter a Webhook URL first', 'error')
      return
    }

    setTestLoading(prev => ({ ...prev, [providerName]: true }))
    try {
      const res = await window.electronAPI.sendExternalNotification(
        config.url,
        `¡Hola desde MonGit! Esta es una prueba de canal de ${providerName.toUpperCase()}.`
      )
      if (res.success) {
        showToast(t('integrations.successSent', 'Test notification sent successfully'), 'success')
      } else {
        showToast(`${t('integrations.errorSent', 'Failed to send notification')}: ${res.error}`, 'error')
      }
    } catch (e) {
      showToast(`${t('integrations.errorSent', 'Failed to send notification')}: ${e.message}`, 'error')
    } finally {
      setTestLoading(prev => ({ ...prev, [providerName]: false }))
    }
  }

  const handleToggleEvent = (providerName, eventName) => {
    setIntegrationsConfig(prev => {
      const currentEvents = prev[providerName].events
      const updatedEvents = currentEvents.includes(eventName)
        ? currentEvents.filter(e => e !== eventName)
        : [...currentEvents, eventName]

      return {
        ...prev,
        [providerName]: {
          ...prev[providerName],
          events: updatedEvents
        }
      }
    })
  }

  const handleUrlChange = (providerName, value) => {
    setIntegrationsConfig(prev => ({
      ...prev,
      [providerName]: {
        ...prev[providerName],
        url: value
      }
    }))
  }

  // --- Automation Helper Functions ---
  const handleAddRule = (e) => {
    e.preventDefault()
    if (!newRule.name.trim() || !newRule.command.trim()) return

    const ruleToAdd = {
      ...newRule,
      id: Math.random().toString(36).substring(7)
    }

    const updatedRules = [...automationRules, ruleToAdd]
    setAutomationRules(updatedRules)
    localStorage.setItem('mongit_automation_rules_v1', JSON.stringify(updatedRules))

    setNewRule({ name: '', trigger: 'post-commit', command: '', enabled: true })
    showToast('Rule added successfully', 'success')
  }

  const handleDeleteRule = (id) => {
    const updatedRules = automationRules.filter(r => r.id !== id)
    setAutomationRules(updatedRules)
    localStorage.setItem('mongit_automation_rules_v1', JSON.stringify(updatedRules))
    showToast('Rule deleted', 'info')
  }

  const handleToggleRuleEnabled = (id) => {
    const updatedRules = automationRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    setAutomationRules(updatedRules)
    localStorage.setItem('mongit_automation_rules_v1', JSON.stringify(updatedRules))
  }

  const handleClearLogs = () => {
    setExecutionLogs([])
    localStorage.removeItem('mongit_automation_logs_v1')
  }

  // URLs for webhooks setup
  const githubWebhookUrl = `http://localhost:${webhookPort}/webhook/github`
  const gitlabWebhookUrl = `http://localhost:${webhookPort}/webhook/gitlab`

  return (
    <div className="flex flex-col h-full bg-[#0d1324] text-slate-100 overflow-hidden">
      {/* Tab Navigation header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0f19]">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-brand-400" />
          <h2 className="text-lg font-bold tracking-wide">{t('integrations.title', 'Integrations')}</h2>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveSubTab('webhooks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'webhooks'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe size={14} />
            <span>{t('integrations.webhooks.title', 'Webhook Server')}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('channels')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'channels'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell size={14} />
            <span>{t('integrations.channels.title', 'Notification Channels')}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('automation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'automation'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={14} />
            <span>{t('integrations.automation.title', 'Automation Rules')}</span>
          </button>
        </div>
      </div>

      {/* Main body scrollable container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* --- 1. WEBHOOK SERVER SUB-TAB --- */}
        {activeSubTab === 'webhooks' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Form */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-slate-800 border ${isServerRunning ? 'border-emerald-500/30' : 'border-slate-700'}`}>
                    <Server size={18} className={isServerRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Local Webhook Server</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isServerRunning ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-xs text-slate-400">
                        {isServerRunning ? `${t('integrations.webhooks.running', 'Listening on port')}: ${webhookPort}` : t('integrations.webhooks.stopped', 'Stopped')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t('integrations.webhooks.port', 'Port')}
                    </label>
                    <input
                      type="number"
                      disabled={isServerRunning}
                      value={webhookPort}
                      onChange={(e) => setWebhookPort(Math.max(1, parseInt(e.target.value) || 3000))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="flex gap-3">
                    {!isServerRunning ? (
                      <button
                        onClick={handleStartWebhookServer}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/10"
                      >
                        <Play size={13} fill="currentColor" />
                        {t('integrations.webhooks.start', 'Start Server')}
                      </button>
                    ) : (
                      <button
                        onClick={handleStopWebhookServer}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/10"
                      >
                        <RefreshCw size={13} />
                        {t('integrations.webhooks.stop', 'Stop Server')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications toggle */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    {t('integrations.webhooks.notifyToggle', 'Show desktop notifications')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableNotifications}
                      onChange={handleNotificationToggle}
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 peer-checked:after:bg-white" />
                  </label>
                </div>
              </div>

              {/* Webhook URLs setup instructions */}
              <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider">
                  {t('integrations.webhooks.urlInfo', 'Payload URL to set in GitHub/GitLab:')}
                </h4>

                <div className="space-y-3">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">GitHub</span>
                      <button
                        onClick={() => copyToClipboard(githubWebhookUrl, 'github')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy payload URL"
                      >
                        {copiedType === 'github' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="text-xs font-mono text-brand-300 bg-slate-950/80 p-2 rounded-lg break-all select-all">
                      {githubWebhookUrl}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">GitLab</span>
                      <button
                        onClick={() => copyToClipboard(gitlabWebhookUrl, 'gitlab')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy payload URL"
                      >
                        {copiedType === 'gitlab' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="text-xs font-mono text-brand-300 bg-slate-950/80 p-2 rounded-lg break-all select-all">
                      {gitlabWebhookUrl}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event History list */}
            <div className="lg:col-span-7 bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[520px]">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-brand-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {t('integrations.webhooks.history', 'Incoming Webhook Events')}
                  </h3>
                </div>
                {webhookEvents.length > 0 && (
                  <button
                    onClick={clearWebhookHistory}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar">
                {webhookEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                    <Globe size={40} className="stroke-[1.5] mb-2 opacity-30" />
                    <p className="text-xs">{t('integrations.webhooks.emptyHistory', 'No events received yet')}</p>
                  </div>
                ) : (
                  webhookEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700/80 transition-all flex items-start gap-3"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[9px] font-bold tracking-wider ${
                          evt.provider === 'github' ? 'bg-slate-800 text-white border border-slate-700' : 'bg-orange-950/40 text-orange-400 border border-orange-500/20'
                        }`}>
                          {evt.provider === 'github' ? 'GH' : 'GL'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-300">{evt.event}</span>
                          <span className="text-[10px] font-mono text-slate-500">{evt.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono break-words leading-relaxed">
                          {evt.info}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 2. NOTIFICATION CHANNELS SUB-TAB --- */}
        {activeSubTab === 'channels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slack integration */}
            <div className="bg-[#121b30] border border-slate-800 hover:border-slate-700/80 transition-all rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{t('integrations.channels.slack', 'Configure Slack')}</h3>
                    <p className="text-xs text-slate-400">Send notifications to Slack channels</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t('integrations.channels.webhookUrl', 'Webhook URL')}
                    </label>
                    <input
                      type="password"
                      value={integrationsConfig.slack.url}
                      onChange={(e) => handleUrlChange('slack', e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-2">
                      {t('integrations.channels.events', 'Trigger Events')}
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      {['Push', 'Pull Request', 'Issue Created', 'Merge'].map((evt) => {
                        const isChecked = integrationsConfig.slack.events?.includes(evt)
                        return (
                          <label key={evt} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleEvent('slack', evt)}
                              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-950 accent-brand-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">{evt}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-5 mt-5 border-t border-slate-800/80">
                <button
                  onClick={() => handleTestIntegration('slack')}
                  disabled={testLoading.slack}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
                >
                  {testLoading.slack ? <RefreshCw size={12} className="animate-spin text-slate-400" /> : <Send size={11} />}
                  <span>{t('integrations.channels.test', 'Test Notification')}</span>
                </button>
                <button
                  onClick={() => handleSaveIntegration('slack')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white transition-all text-xs font-semibold shadow-lg shadow-brand-500/10"
                >
                  <Shield size={12} />
                  <span>{t('integrations.channels.save', 'Save Integration')}</span>
                </button>
              </div>
            </div>

            {/* Discord integration */}
            <div className="bg-[#121b30] border border-slate-800 hover:border-slate-700/80 transition-all rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{t('integrations.channels.discord', 'Configure Discord')}</h3>
                    <p className="text-xs text-slate-400">Send notifications to Discord channels via Webhook</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t('integrations.channels.webhookUrl', 'Webhook URL')}
                    </label>
                    <input
                      type="password"
                      value={integrationsConfig.discord.url}
                      onChange={(e) => handleUrlChange('discord', e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-2">
                      {t('integrations.channels.events', 'Trigger Events')}
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      {['Push', 'Pull Request', 'Issue Created', 'Merge'].map((evt) => {
                        const isChecked = integrationsConfig.discord.events?.includes(evt)
                        return (
                          <label key={evt} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleEvent('discord', evt)}
                              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-950 accent-brand-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">{evt}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-5 mt-5 border-t border-slate-800/80">
                <button
                  onClick={() => handleTestIntegration('discord')}
                  disabled={testLoading.discord}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
                >
                  {testLoading.discord ? <RefreshCw size={12} className="animate-spin text-slate-400" /> : <Send size={11} />}
                  <span>{t('integrations.channels.test', 'Test Notification')}</span>
                </button>
                <button
                  onClick={() => handleSaveIntegration('discord')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white transition-all text-xs font-semibold shadow-lg shadow-brand-500/10"
                >
                  <Shield size={12} />
                  <span>{t('integrations.channels.save', 'Save Integration')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. AUTOMATION RULES SUB-TAB --- */}
        {activeSubTab === 'automation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Create & List rules */}
            <div className="lg:col-span-6 space-y-6">
              {/* Add rule form */}
              <form onSubmit={handleAddRule} className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Plus size={16} className="text-brand-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {t('integrations.automation.addRule', 'Add Rule')}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t('integrations.automation.ruleName', 'Rule Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Run Unit Tests"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        {t('integrations.automation.trigger', 'Git Event Trigger')}
                      </label>
                      <select
                        value={newRule.trigger}
                        onChange={(e) => setNewRule(prev => ({ ...prev, trigger: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                      >
                        <option value="post-commit">post-commit</option>
                        <option value="post-push">post-push</option>
                        <option value="post-pull">post-pull</option>
                        <option value="post-merge">post-merge</option>
                      </select>
                    </div>

                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newRule.enabled}
                          onChange={(e) => setNewRule(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500 accent-brand-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-300 font-medium">Initially Enabled</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      {t('integrations.automation.command', 'Command to Run')}
                    </label>
                    <input
                      type="text"
                      required
                      value={newRule.command}
                      onChange={(e) => setNewRule(prev => ({ ...prev, command: e.target.value }))}
                      placeholder="e.g. npm run test"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white transition-all text-xs font-semibold shadow-lg shadow-brand-500/10"
                  >
                    <Plus size={14} />
                    <span>{t('integrations.automation.addRule', 'Add Rule')}</span>
                  </button>
                </div>
              </form>

              {/* Active rules list */}
              <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">
                  {t('integrations.automation.rulesList', 'Active Rules')}
                </h3>

                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {automationRules.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      {t('integrations.automation.noRules', 'No automation rules configured')}
                    </div>
                  ) : (
                    automationRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white break-words">{rule.name}</span>
                            <span className="px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-[10px] text-brand-300 font-mono">
                              {rule.trigger}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-1 break-all bg-slate-950/30 p-1.5 rounded border border-slate-800">
                            {rule.command}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={rule.enabled}
                              onChange={() => handleToggleRuleEnabled(rule.id)}
                            />
                            <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500 peer-checked:after:bg-white" />
                          </label>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Execution logs */}
            <div className="lg:col-span-6 bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[540px]">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-brand-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {t('integrations.automation.logs', 'Execution Logs')}
                  </h3>
                </div>
                {executionLogs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar">
                {executionLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                    <Terminal size={40} className="stroke-[1.5] mb-2 opacity-30" />
                    <p className="text-xs">{t('integrations.automation.noLogs', 'No execution logs yet')}</p>
                  </div>
                ) : (
                  executionLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id
                    return (
                      <div
                        key={log.id}
                        className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all"
                      >
                        {/* Header clickable */}
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-900/60 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-200">{log.ruleName}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {log.trigger}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{log.timestamp}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {log.status === 'running' && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 flex items-center gap-1">
                                <RefreshCw size={9} className="animate-spin" />
                                <span>Running</span>
                              </span>
                            )}
                            {log.status === 'success' && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 size={10} />
                                <span>Success</span>
                              </span>
                            )}
                            {log.status === 'failed' && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                                <AlertTriangle size={10} />
                                <span>Failed</span>
                              </span>
                            )}
                            <ChevronRight
                              size={14}
                              className={`text-slate-500 transition-all ${isExpanded ? 'rotate-90 text-slate-300' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Collapsible output details */}
                        {isExpanded && (
                          <div className="border-t border-slate-800 bg-[#090e1b] p-3 space-y-2 text-xs font-mono">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Command</span>
                              <span className="text-slate-300 bg-slate-900 px-2 py-1 rounded block border border-slate-800">{log.script}</span>
                            </div>
                            
                            {(log.stdout || log.status === 'success') && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Output (stdout)</span>
                                <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[150px] custom-scrollbar">
                                  {log.stdout || 'Execution finished successfully.'}
                                </pre>
                              </div>
                            )}

                            {log.stderr && (
                              <div>
                                <span className="text-[10px] font-bold text-rose-500 block uppercase mb-1">Errors (stderr)</span>
                                <pre className="bg-rose-950/20 p-2.5 rounded border border-rose-500/20 text-[11px] text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-[150px] custom-scrollbar">
                                  {log.stderr}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
