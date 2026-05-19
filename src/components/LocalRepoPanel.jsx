import React, { useState, useEffect } from 'react'
import { Folder, RefreshCw, Check, CheckSquare, Square, UploadCloud, AlertCircle } from 'lucide-react'

export default function LocalRepoPanel() {
  const [folderPath, setFolderPath] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isElectron = !!window.electronAPI

  const loadStatus = async (path) => {
    if (!isElectron) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const status = await window.electronAPI.getGitStatus(path)
      if (status === null) {
        setError('No se pudo cargar el estado de Git. ¿Es un repositorio válido?')
        setFiles([])
      } else {
        setFiles(status)
        // Auto-select all by default when loaded
        setSelectedFiles(new Set(status.map(f => f.path)))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFolder = async () => {
    if (!isElectron) return
    const path = await window.electronAPI.selectFolder()
    if (path) {
      setFolderPath(path)
      loadStatus(path)
    }
  }

  const toggleFile = (path) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) newSelected.delete(path)
    else newSelected.add(path)
    setSelectedFiles(newSelected)
  }

  const toggleAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)))
    }
  }

  const handleCommit = async () => {
    if (!message.trim() || selectedFiles.size === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.commitChanges(folderPath, Array.from(selectedFiles), message)
      if (result.success) {
        setMessage('')
        setSuccess('Commit realizado con éxito')
        loadStatus(folderPath)
      } else {
        setError('Error al hacer commit: ' + result.error)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.pushChanges(folderPath)
      if (result.success) {
        setSuccess('Cambios subidos (push) con éxito')
      } else {
        setError('Error al hacer push: ' + result.error)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isElectron) return null

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Folder size={16} className="text-brand-400" />
          Repositorio Local
        </h2>
        <button onClick={handleSelectFolder} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors">
          {folderPath ? 'Cambiar Carpeta' : 'Abrir Carpeta...'}
        </button>
      </div>

      {!folderPath ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
          <Folder size={48} className="mb-4 opacity-50" />
          <p className="text-sm">Selecciona una carpeta local para gestionar sus cambios</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 bg-slate-900/50 border-b border-slate-700/50 text-xs text-slate-400 truncate">
            {folderPath}
            <button onClick={() => loadStatus(folderPath)} className="ml-2 text-brand-400 hover:text-brand-300" title="Refrescar">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2"><AlertCircle size={14} className="flex-shrink-0" />{error}</div>}
            {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex gap-2"><Check size={14} className="flex-shrink-0" />{success}</div>}

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Archivos Modificados ({files.length})</h3>
              {files.length > 0 && (
                <button onClick={toggleAll} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  {selectedFiles.size === files.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  Todos
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-sm">
                No hay cambios pendientes en este repositorio.
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((file, i) => (
                  <label key={i} className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded-lg cursor-pointer group transition-colors">
                    <button type="button" onClick={() => toggleFile(file.path)} className="text-slate-500 group-hover:text-brand-400">
                      {selectedFiles.has(file.path) ? <CheckSquare size={16} className="text-brand-400" /> : <Square size={16} />}
                    </button>
                    <span className={`text-xs font-mono w-5 text-center font-bold ${file.status.includes('M') ? 'text-amber-400' : file.status.includes('D') ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {file.status.trim()}
                    </span>
                    <span className="text-sm text-slate-300 truncate">{file.path}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Mensaje del commit..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 mb-3 focus:ring-1 focus:ring-brand-500 outline-none"
              disabled={files.length === 0 || loading}
            />
            <div className="flex gap-2">
              <button 
                onClick={handleCommit}
                disabled={files.length === 0 || loading || !message.trim() || selectedFiles.size === 0}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> Hacer Commit ({selectedFiles.size})
              </button>
              <button 
                onClick={handlePush}
                disabled={loading}
                className="px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                title="Hacer Push de los commits locales"
              >
                <UploadCloud size={16} /> Push
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
