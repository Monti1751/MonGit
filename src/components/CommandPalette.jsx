import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search, GitBranch, GitCommit, GitMerge, GitPullRequest,
  RefreshCw, Settings, Shield, Globe, Terminal, Plus, Layers,
  Download, Upload, Command, X
} from 'lucide-react'

export default function CommandPalette({ isOpen, onClose, onSelectCommand }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const COMMANDS = [
    { id: 'sync', icon: RefreshCw, label: t('app.buttons.sync', 'Sincronizar (Pull & Push)'), keys: 'Ctrl+Shift+S', category: 'actions' },
    { id: 'newBranch', icon: Plus, label: t('app.buttons.newBranch', 'Nueva Rama'), keys: 'Ctrl+B', category: 'actions' },
    { id: 'history', icon: GitCommit, label: t('app.tabs.history', 'Historial'), keys: 'Tab 1', category: 'navigation' },
    { id: 'merge', icon: GitMerge, label: t('app.tabs.merge', 'Fusión y Conflictos'), keys: 'Tab 2', category: 'navigation' },
    { id: 'advanced', icon: Layers, label: t('app.tabs.advanced', 'Avanzado'), keys: 'Tab 3', category: 'navigation' },
    { id: 'analysis', icon: Search, label: t('app.tabs.analysis', 'Análisis'), keys: 'Tab 4', category: 'navigation' },
    { id: 'collaboration', icon: GitPullRequest, label: t('app.tabs.collaboration', 'Colaboración'), keys: 'Tab 5', category: 'navigation' },
    { id: 'issues', icon: Terminal, label: t('app.tabs.issues', 'Issues'), keys: 'Tab 6', category: 'navigation' },
    { id: 'integrations', icon: Globe, label: t('app.tabs.integrations', 'Integraciones'), keys: 'Tab 7', category: 'navigation' },
    { id: 'security', icon: Shield, label: t('app.tabs.security', 'Seguridad'), keys: 'Tab 8', category: 'navigation' },
    { id: 'settings', icon: Settings, label: t('app.tabs.settings', 'Configuración'), keys: 'Tab 9', category: 'navigation' },
  ]

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.id.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex].id)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, onSelectCommand])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search size={18} className="text-teal-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder={t('ux.commandPalette.placeholder', 'Escribe un comando o busca una pestaña... (Ctrl+K)')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {t('ux.commandPalette.noResults', 'No se encontraron comandos.')}
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    onSelectCommand(cmd.id)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isSelected ? 'text-teal-400' : 'text-slate-400'} />
                    <span>{cmd.label}</span>
                  </div>
                  {cmd.keys && (
                    <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700/60 text-[10px] font-mono text-slate-400">
                      {cmd.keys}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">↑↓</kbd> navegar</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">↵</kbd> seleccionar</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}
