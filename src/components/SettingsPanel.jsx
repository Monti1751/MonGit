import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Settings, GitBranch, Code2, Palette, Keyboard, Save,
  Trash2, Plus, RotateCcw, Check, AlertCircle, Sun, Moon,
  Terminal, FileCode, Zap, Eye
} from 'lucide-react'

import { THEMES, applyTheme } from '../utils/theme'

// ── Hook Descriptions ────────────────────────────────────────────────────────
const HOOK_DOCS = {
  'pre-commit': { icon: '🔒', runsBefore: 'commit' },
  'commit-msg': { icon: '✏️', runsBefore: 'commit message save' },
  'post-commit': { icon: '✅', runsBefore: 'after commit' },
  'pre-push': { icon: '🚀', runsBefore: 'push' }
}

// ── Keyboard Shortcuts ───────────────────────────────────────────────────────
const DEFAULT_SHORTCUTS = [
  { action: 'sync', keys: ['Ctrl', 'Shift', 'S'] },
  { action: 'commit', keys: ['Ctrl', 'Shift', 'C'] },
  { action: 'newBranch', keys: ['Ctrl', 'B'] },
  { action: 'switchBranch', keys: ['Ctrl', 'Shift', 'B'] },
  { action: 'search', keys: ['Ctrl', 'K'] }
]

export default function SettingsPanel({ folderPath, showToast }) {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState('repo')

  // ── Repo Settings State ──
  const [repoSettings, setRepoSettings] = useState({
    defaultBranch: 'main',
    requirePRReviews: false,
    requiredReviews: 1,
    requireStatusChecks: true,
    autoDeleteBranch: false
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // ── Git Hooks State ──
  const [hooks, setHooks] = useState({
    'pre-commit': '', 'commit-msg': '', 'post-commit': '', 'pre-push': ''
  })
  const [selectedHook, setSelectedHook] = useState('pre-commit')
  const [hooksLoading, setHooksLoading] = useState(false)
  const [hookSaved, setHookSaved] = useState(false)

  // ── Theme State ──
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('mongit-theme') || 'dark-default'
  })

  // ── Load Settings ──
  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (folderPath) loadHooks()
  }, [folderPath])

  const loadSettings = async () => {
    try {
      setSettingsLoading(true)
      const result = await window.electronAPI.getAppSettings()
      if (result.success && result.settings && Object.keys(result.settings).length > 0) {
        setRepoSettings(prev => ({ ...prev, ...result.settings }))
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setSettingsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      const result = await window.electronAPI.saveAppSettings(repoSettings)
      if (result.success) {
        setSettingsSaved(true)
        showToast?.(t('settings.repo.saved', '✓ Configuración guardada'))
        setTimeout(() => setSettingsSaved(false), 2000)
      }
    } catch (err) {
      showToast?.(`Error: ${err.message}`)
    }
  }

  const loadHooks = async () => {
    if (!folderPath) return
    try {
      setHooksLoading(true)
      const result = await window.electronAPI.getGitHooks(folderPath)
      if (result.success) setHooks(result.hooks)
    } catch (err) {
      console.error('Error loading hooks:', err)
    } finally {
      setHooksLoading(false)
    }
  }

  const saveHook = async () => {
    if (!folderPath) return
    try {
      const result = await window.electronAPI.saveGitHook(folderPath, selectedHook, hooks[selectedHook])
      if (result.success) {
        setHookSaved(true)
        showToast?.(t('settings.hooks.saved', `✓ Hook ${selectedHook} guardado`))
        setTimeout(() => setHookSaved(false), 2000)
      }
    } catch (err) {
      showToast?.(`Error: ${err.message}`)
    }
  }

  const deleteHook = async () => {
    if (!folderPath) return
    try {
      const result = await window.electronAPI.deleteGitHook(folderPath, selectedHook)
      if (result.success) {
        setHooks(prev => ({ ...prev, [selectedHook]: '' }))
        showToast?.(t('settings.hooks.deleted', `✓ Hook ${selectedHook} eliminado`))
      }
    } catch (err) {
      showToast?.(`Error: ${err.message}`)
    }
  }

  const handleSelectTheme = (theme) => {
    applyTheme(theme.id)
    setCurrentTheme(theme.id)
  }

  const sections = [
    { id: 'repo', icon: GitBranch, label: t('settings.sections.repo', 'Repositorio') },
    { id: 'hooks', icon: Terminal, label: t('settings.sections.hooks', 'Git Hooks') },
    { id: 'theme', icon: Palette, label: t('settings.sections.theme', 'Temas') },
    { id: 'shortcuts', icon: Keyboard, label: t('settings.sections.shortcuts', 'Atajos') }
  ]

  return (
    <div className="h-full flex flex-col" style={{ background: 'linear-gradient(180deg, rgba(14,165,233,0.03) 0%, transparent 40%)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
            <Settings size={20} className="text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('settings.title', 'Configuración y Personalización')}</h2>
            <p className="text-xs text-slate-400">{t('settings.subtitle', 'Personaliza el comportamiento y la apariencia de MonGit')}</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 mt-4 p-1 bg-slate-800/50 rounded-lg border border-slate-700/30">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center ${
                activeSection === s.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* ── REPO SETTINGS ────────────────────────────────── */}
        {activeSection === 'repo' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-5 space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <GitBranch size={16} className="text-teal-400" />
                {t('settings.repo.title', 'Configuración del Repositorio')}
              </h3>

              {/* Default Branch */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  {t('settings.repo.defaultBranch', 'Rama por defecto')}
                </label>
                <select
                  value={repoSettings.defaultBranch}
                  onChange={e => setRepoSettings({ ...repoSettings, defaultBranch: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:border-teal-500/50 focus:outline-none transition-colors"
                >
                  <option value="main">main</option>
                  <option value="master">master</option>
                  <option value="develop">develop</option>
                </select>
              </div>

              {/* Checkbox Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-300 p-2.5 rounded-lg hover:bg-slate-700/30 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repoSettings.requirePRReviews}
                    onChange={e => setRepoSettings({ ...repoSettings, requirePRReviews: e.target.checked })}
                    className="w-4 h-4 rounded accent-teal-500"
                  />
                  {t('settings.repo.requireReviews', 'Requerir reviews en Pull Requests')}
                </label>

                {repoSettings.requirePRReviews && (
                  <div className="ml-10 mt-1">
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                      {t('settings.repo.requiredReviewCount', 'Número de reviews requeridas')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={repoSettings.requiredReviews}
                      onChange={e => setRepoSettings({ ...repoSettings, requiredReviews: parseInt(e.target.value) || 1 })}
                      className="w-24 bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 text-sm text-slate-300 p-2.5 rounded-lg hover:bg-slate-700/30 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repoSettings.requireStatusChecks}
                    onChange={e => setRepoSettings({ ...repoSettings, requireStatusChecks: e.target.checked })}
                    className="w-4 h-4 rounded accent-teal-500"
                  />
                  {t('settings.repo.requireChecks', 'Requerir que pasen los checks de CI/CD')}
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-300 p-2.5 rounded-lg hover:bg-slate-700/30 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repoSettings.autoDeleteBranch}
                    onChange={e => setRepoSettings({ ...repoSettings, autoDeleteBranch: e.target.checked })}
                    className="w-4 h-4 rounded accent-teal-500"
                  />
                  {t('settings.repo.autoDelete', 'Eliminar ramas automáticamente después de merge')}
                </label>
              </div>

              {/* Save Button */}
              <button
                onClick={saveSettings}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  settingsSaved
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30'
                }`}
              >
                {settingsSaved ? <Check size={16} /> : <Save size={16} />}
                {settingsSaved ? t('settings.repo.savedBtn', '¡Guardado!') : t('settings.repo.saveBtn', 'Guardar Configuración')}
              </button>
            </div>
          </div>
        )}

        {/* ── GIT HOOKS EDITOR ──────────────────────────────── */}
        {activeSection === 'hooks' && (
          <div className="max-w-4xl">
            {!folderPath ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <AlertCircle size={40} className="mb-3 opacity-50" />
                <p className="text-sm">{t('settings.hooks.noRepo', 'Abre un repositorio para editar los Git Hooks')}</p>
              </div>
            ) : (
              <div className="flex gap-4" style={{ height: '500px' }}>
                {/* Hook Sidebar */}
                <div className="flex-shrink-0 w-44 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                    {t('settings.hooks.title', 'Git Hooks')}
                  </h3>
                  {Object.keys(hooks).map(hookName => (
                    <button
                      key={hookName}
                      onClick={() => setSelectedHook(hookName)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedHook === hookName
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10'
                          : 'bg-slate-800/40 text-slate-300 border border-slate-700/30 hover:bg-slate-700/50'
                      }`}
                    >
                      <span>{HOOK_DOCS[hookName]?.icon}</span>
                      <span className="font-mono text-xs">{hookName}</span>
                      {hooks[hookName] && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-teal-400"></span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Hook Editor */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* Hook Documentation */}
                  <div className="text-xs text-slate-400 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
                    <p className="font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <FileCode size={14} className="text-teal-400" />
                      {t('settings.hooks.docTitle', 'Documentación')}
                    </p>
                    <p>
                      {t(`settings.hooks.doc.${selectedHook}`,
                        selectedHook === 'pre-commit'  ? 'Se ejecuta antes de crear un commit. Útil para linting, tests, o formateo de código.' :
                        selectedHook === 'commit-msg'  ? 'Valida o modifica el mensaje del commit antes de guardarlo.' :
                        selectedHook === 'post-commit' ? 'Se ejecuta después de crear un commit. Útil para notificaciones o deploys.' :
                        'Se ejecuta antes de hacer push. Ideal para tests de integración.'
                      )}
                    </p>
                  </div>

                  {/* Code Editor */}
                  <textarea
                    value={hooks[selectedHook]}
                    onChange={e => setHooks({ ...hooks, [selectedHook]: e.target.value })}
                    className="flex-1 bg-slate-900/60 border border-slate-600/50 rounded-lg px-4 py-3 font-mono text-sm text-white focus:border-teal-500/50 focus:outline-none resize-none transition-colors"
                    placeholder={`#!/bin/bash\n# ${t('settings.hooks.placeholder', 'Escribe tu script aquí...')}`}
                    spellCheck={false}
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={saveHook}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        hookSaved
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30'
                      }`}
                    >
                      {hookSaved ? <Check size={16} /> : <Save size={16} />}
                      {hookSaved ? t('settings.hooks.savedBtn', '¡Guardado!') : t('settings.hooks.saveBtn', 'Guardar Hook')}
                    </button>
                    <button
                      onClick={deleteHook}
                      disabled={!hooks[selectedHook]}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      {t('settings.hooks.deleteBtn', 'Eliminar')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── THEME SELECTOR ────────────────────────────────── */}
        {activeSection === 'theme' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Palette size={16} className="text-teal-400" />
                {t('settings.theme.title', 'Tema Visual')}
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                {t('settings.theme.description', 'Selecciona un esquema de colores para personalizar la interfaz.')}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectTheme(theme)}
                    className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      currentTheme === theme.id
                        ? 'border-teal-400 bg-teal-500/10 shadow-lg shadow-teal-500/10'
                        : 'border-slate-600/50 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-700/30'
                    }`}
                  >
                    {/* Theme Preview Bar */}
                    <div
                      className="w-full h-8 rounded-lg mb-3"
                      style={{ background: theme.preview }}
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{theme.name}</p>
                        <div className="flex gap-1.5 mt-2">
                          <div className="w-4 h-4 rounded-full border border-slate-600/50" style={{ backgroundColor: theme.colors.primary }} />
                          <div className="w-4 h-4 rounded-full border border-slate-600/50" style={{ backgroundColor: theme.colors.bg }} />
                          <div className="w-4 h-4 rounded-full border border-slate-600/50" style={{ backgroundColor: theme.colors.surface }} />
                        </div>
                      </div>
                      {currentTheme === theme.id && (
                        <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── KEYBOARD SHORTCUTS ─────────────────────────────── */}
        {activeSection === 'shortcuts' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Keyboard size={16} className="text-teal-400" />
                {t('settings.shortcuts.title', 'Atajos de Teclado')}
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                {t('settings.shortcuts.description', 'Referencia rápida de los atajos de teclado disponibles en MonGit.')}
              </p>

              <div className="space-y-2">
                {DEFAULT_SHORTCUTS.map(s => (
                  <div key={s.action} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {t(`settings.shortcuts.actions.${s.action}`,
                          s.action === 'sync' ? 'Sincronizar (Pull & Push)' :
                          s.action === 'commit' ? 'Crear commit' :
                          s.action === 'newBranch' ? 'Nueva rama' :
                          s.action === 'switchBranch' ? 'Cambiar rama' :
                          'Buscar'
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{s.action}</p>
                    </div>
                    <div className="flex gap-1">
                      {s.keys.map((key, ki) => (
                        <span
                          key={ki}
                          className="px-2.5 py-1.5 bg-slate-700/60 rounded-md text-xs font-mono text-slate-200 border border-slate-600/50 shadow-sm"
                          style={{ minWidth: '2rem', textAlign: 'center' }}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
