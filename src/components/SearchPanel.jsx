import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Calendar, User, FileText, ChevronRight, GitCommit } from 'lucide-react'

export default function SearchPanel({ folderPath }) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({
    message: '',
    author: '',
    dateFrom: '',
    dateTo: ''
  })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!window.electronAPI || !folderPath) return
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const response = await window.electronAPI.gitSearchLog(folderPath, filters)
      if (response.success) {
        setResults(response.commits)
      } else {
        setError(response.error)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 flex flex-col h-full">
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Search size={14} /> {t('analysis.search.title', 'Búsqueda Avanzada')}
        </h3>
        
        <div className="space-y-2">
          <div className="relative">
            <FileText size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input 
              placeholder={t('analysis.search.message', 'Mensaje del commit...')}
              value={filters.message}
              onChange={e => setFilters({...filters, message: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-brand-500 outline-none"
            />
          </div>
          
          <div className="relative">
            <User size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input 
              placeholder={t('analysis.search.author', 'Autor...')}
              value={filters.author}
              onChange={e => setFilters({...filters, author: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-brand-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input 
                type="date" 
                value={filters.dateFrom}
                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-brand-500 outline-none [color-scheme:dark]"
              />
            </div>
            <div className="relative flex-1">
              <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input 
                type="date" 
                value={filters.dateTo}
                onChange={e => setFilters({...filters, dateTo: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-brand-500 outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Search size={14} />}
          {t('analysis.search.button', 'Buscar')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-800/30 rounded-xl border border-slate-700/50 p-2">
        {error ? (
          <div className="p-4 text-rose-400 text-sm text-center">{error}</div>
        ) : loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" /></div>
        ) : results.length > 0 ? (
          <div className="space-y-1">
            {results.map(commit => (
              <div key={commit.id} className="flex flex-col gap-1 p-3 bg-slate-800/80 hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-600/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <GitCommit size={14} className="text-brand-400 flex-shrink-0" />
                    <span className="font-mono text-[10px] text-brand-300 flex-shrink-0">{commit.id.slice(0, 7)}</span>
                    <span className="text-sm text-slate-200 font-medium truncate">{commit.message}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 pl-5">
                  <span className="font-medium text-slate-400">{commit.author}</span>
                  <span>•</span>
                  <span>{commit.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {t('analysis.search.noResults', 'No se encontraron commits.')}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-600 text-sm">
            {t('analysis.search.prompt', 'Utiliza los filtros de arriba para buscar.')}
          </div>
        )}
      </div>
    </div>
  )
}
