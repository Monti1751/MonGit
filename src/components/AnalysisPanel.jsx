import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart2, Search as SearchIcon, FileSearch } from 'lucide-react'
import StatsPanel from './StatsPanel'
import SearchPanel from './SearchPanel'
import FileAnalysisPanel from './FileAnalysisPanel'

export default function AnalysisPanel({ folderPath }) {
  const { t } = useTranslation()
  const [analysisTab, setAnalysisTab] = useState('stats')

  const tabs = [
    { id: 'stats', label: t('analysis.tabs.stats', 'Estadísticas'), icon: BarChart2 },
    { id: 'search', label: t('analysis.tabs.search', 'Búsqueda'), icon: SearchIcon },
    { id: 'file', label: t('analysis.tabs.file', 'Archivos'), icon: FileSearch }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Header Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-700/50">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = analysisTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setAnalysisTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                isActive 
                  ? 'bg-brand-500/20 text-brand-400' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {analysisTab === 'stats' && <StatsPanel folderPath={folderPath} />}
        {analysisTab === 'search' && <SearchPanel folderPath={folderPath} />}
        {analysisTab === 'file' && <FileAnalysisPanel folderPath={folderPath} />}
      </div>
    </div>
  )
}
