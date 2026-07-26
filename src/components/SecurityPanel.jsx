import React, { useState, useEffect } from 'react'
import {
  Shield, Key, ShieldCheck, ShieldAlert, Smartphone, Plus, Trash2, Copy, Check,
  RefreshCw, Search, AlertTriangle, CheckCircle2, Lock, FileCode, ExternalLink,
  ChevronRight, AlertCircle, Info, Sparkles
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SecurityPanel({
  folderPath,
  providers = [],
  showToast
}) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('ssh')

  // ── SSH Keys State ──────────────────────────────────────────────────────────
  const [sshKeys, setSshKeys] = useState([])
  const [loadingSsh, setLoadingSsh] = useState(false)
  const [showNewSshModal, setShowNewSshModal] = useState(false)
  const [newSshForm, setNewSshForm] = useState({ name: '', keyType: 'ed25519', passphrase: '' })
  const [generatingSsh, setGeneratingSsh] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState(null)

  // ── GPG State ───────────────────────────────────────────────────────────────
  const [gpgKeys, setGpgKeys] = useState([])
  const [activeSigningKey, setActiveSigningKey] = useState('')
  const [gpgSignEnabled, setGpgSignEnabled] = useState(false)
  const [loadingGpg, setLoadingGpg] = useState(false)
  const [savingGpg, setSavingGpg] = useState(false)

  // ── Secret Scanner State ────────────────────────────────────────────────────
  const [scanningSecrets, setScanningSecrets] = useState(false)
  const [detectedSecrets, setDetectedSecrets] = useState([])
  const [scannedFilesCount, setScannedFilesCount] = useState(null)
  const [lastScanTime, setLastScanTime] = useState(null)

  // ── Load Initial Data ───────────────────────────────────────────────────────
  useEffect(() => {
    loadSshKeys()
    loadGpgKeys()
  }, [])

  // ── SSH Handlers ────────────────────────────────────────────────────────────
  const loadSshKeys = async () => {
    if (!window.electronAPI?.getSSHKeys) return
    setLoadingSsh(true)
    try {
      const keys = await window.electronAPI.getSSHKeys()
      setSshKeys(keys || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSsh(false)
    }
  }

  const handleGenerateSshKey = async (e) => {
    e.preventDefault()
    if (!window.electronAPI?.generateSSHKey) return
    setGeneratingSsh(true)
    try {
      const result = await window.electronAPI.generateSSHKey(newSshForm)
      if (result.success) {
        showToast(t('security.ssh.successGenerated', 'Clave SSH generada correctamente'), 'success')
        setShowNewSshModal(false)
        setNewSshForm({ name: '', keyType: 'ed25519', passphrase: '' })
        loadSshKeys()
      } else {
        showToast(result.error || t('security.ssh.errorGenerating', 'Error al generar la clave SSH'), 'error')
      }
    } catch (err) {
      showToast(err.message || 'Error inesperado', 'error')
    } finally {
      setGeneratingSsh(false)
    }
  }

  const handleDeleteSshKey = async (keyId) => {
    if (!window.confirm(t('security.ssh.confirmDelete', '¿Eliminar esta clave SSH?'))) return
    if (!window.electronAPI?.deleteSSHKey) return
    try {
      const result = await window.electronAPI.deleteSSHKey(keyId)
      if (result.success) {
        showToast(t('security.ssh.successDeleted', 'Clave SSH eliminada'), 'info')
        loadSshKeys()
      } else {
        showToast(result.error || 'Error al eliminar', 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleCopyPublicKey = (key) => {
    navigator.clipboard.writeText(key.publicKey)
    setCopiedKeyId(key.id)
    showToast(t('security.ssh.successCopied', 'Clave pública copiada al portapapeles'), 'success')
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  // ── GPG Handlers ────────────────────────────────────────────────────────────
  const loadGpgKeys = async () => {
    if (!window.electronAPI?.getGPGKeys) return
    setLoadingGpg(true)
    try {
      const res = await window.electronAPI.getGPGKeys()
      setGpgKeys(res.keys || [])
      setActiveSigningKey(res.activeSigningKey || '')
      setGpgSignEnabled(res.gpgSignEnabled || false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingGpg(false)
    }
  }

  const handleToggleGpgSign = async (keyId, enable) => {
    if (!window.electronAPI?.configureGitGPG) return
    setSavingGpg(true)
    try {
      const result = await window.electronAPI.configureGitGPG({ keyId, enableSigning: enable })
      if (result.success) {
        if (keyId) setActiveSigningKey(keyId)
        setGpgSignEnabled(enable)
        showToast(t('security.gpg.successConfigured', 'Configuración GPG actualizada'), 'success')
      } else {
        showToast(result.error || 'Error al configurar GPG', 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingGpg(false)
    }
  }

  // ── Secret Scanner Handlers ──────────────────────────────────────────────────
  const handleScanSecrets = async () => {
    if (!folderPath) {
      showToast(t('security.scanner.noFolder', 'Selecciona un repositorio primero'), 'error')
      return
    }
    if (!window.electronAPI?.scanForSecrets) return
    setScanningSecrets(true)
    try {
      const result = await window.electronAPI.scanForSecrets(folderPath)
      if (result.success) {
        setDetectedSecrets(result.secrets || [])
        setScannedFilesCount(result.totalScannedFiles || 0)
        setLastScanTime(new Date().toLocaleTimeString())
        if ((result.secrets || []).length === 0) {
          showToast(t('security.scanner.noSecretsFound', '¡No se encontraron secretos expuestos!'), 'success')
        } else {
          showToast(`${t('security.scanner.secretsFound', 'Atención: Se encontraron secretos expuestos')}: ${result.secrets.length}`, 'error')
        }
      } else {
        showToast(result.error || 'Error durante el escaneo', 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setScanningSecrets(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1324] text-slate-100 overflow-hidden">
      {/* Header & Sub-Tab Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0f19] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-brand-400" />
          <h2 className="text-lg font-bold tracking-wide">{t('security.title', 'Seguridad y Autenticación')}</h2>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('ssh')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'ssh'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key size={14} />
            <span>{t('security.tabs.ssh', 'Claves SSH')}</span>
          </button>
          <button
            onClick={() => setActiveTab('gpg')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'gpg'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={14} />
            <span>{t('security.tabs.gpg', 'Firma GPG')}</span>
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'scanner'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert size={14} />
            <span>{t('security.tabs.scanner', 'Escáner de Secretos')}</span>
            {detectedSecrets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                {detectedSecrets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('2fa')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === '2fa'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone size={14} />
            <span>{t('security.tabs.2fa', 'Estado 2FA')}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* ── 1. SSH KEYS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'ssh' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('security.ssh.title', 'Gestión de Claves SSH')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('security.ssh.subtitle', 'Administra tus claves de autenticación SSH almacenadas en ~/.ssh')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadSshKeys}
                  disabled={loadingSsh}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw size={14} className={loadingSsh ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setShowNewSshModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition-all shadow-lg shadow-brand-500/10"
                >
                  <Plus size={14} />
                  <span>{t('security.ssh.generateBtn', 'Generar SSH Key')}</span>
                </button>
              </div>
            </div>

            {/* SSH Keys List */}
            <div className="space-y-3">
              {sshKeys.length === 0 ? (
                <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
                  <Key size={40} className="mx-auto mb-2 opacity-30 stroke-[1.5]" />
                  <p className="text-xs">{t('security.ssh.noKeys', 'No se encontraron claves SSH en ~/.ssh')}</p>
                </div>
              ) : (
                sshKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-[#121b30] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-brand-400">
                          <Key size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{key.name}</span>
                            <span className="px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-[10px] font-mono text-brand-300 uppercase">
                              {key.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Huella: <span className="text-slate-300">{key.fingerprint}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyPublicKey(key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                        >
                          {copiedKeyId === key.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          <span>{t('security.ssh.copyPubBtn', 'Copiar Clave Pública')}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSshKey(key.id)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar clave"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-[11px] font-mono text-slate-400 break-all select-all max-h-20 overflow-y-auto custom-scrollbar">
                      {key.publicKey}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 2. GPG SIGNING TAB ────────────────────────────────────────────── */}
        {activeTab === 'gpg' && (
          <div className="space-y-6">
            <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{t('security.gpg.title', 'Firmado GPG de Commits')}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('security.gpg.subtitle', 'Firma digitalmente tus commits con claves GPG para verificar tu identidad en GitHub/GitLab.')}
                  </p>
                </div>
                <button
                  onClick={loadGpgKeys}
                  disabled={loadingGpg}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw size={14} className={loadingGpg ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Toggle commit.gpgsign */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${gpgSignEnabled ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {t('security.gpg.autoSignLabel', 'Firmar commits automáticamente')}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Configura <code className="text-brand-300 font-mono">commit.gpgsign=true</code> en git global
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={gpgSignEnabled}
                    disabled={savingGpg}
                    onChange={(e) => handleToggleGpgSign(activeSigningKey, e.target.checked)}
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white" />
                </label>
              </div>
            </div>

            {/* GPG Keys Selector */}
            <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('security.gpg.availableKeys', 'Claves GPG Disponibles')}
              </h4>

              {gpgKeys.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-xl text-slate-500 text-xs space-y-2">
                  <AlertCircle size={30} className="mx-auto opacity-30" />
                  <p>{t('security.gpg.noKeysFound', 'No se encontraron claves GPG en el llavero de GPG.')}</p>
                  <p className="text-[11px] text-slate-600">
                    Asegúrate de tener <code className="font-mono">gpg</code> instalado y claves generadas con <code className="font-mono">gpg --full-generate-key</code>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gpgKeys.map((key) => {
                    const isSelected = activeSigningKey === key.keyid
                    const uid = key.uids[0] || { name: 'Desconocido', email: '' }
                    return (
                      <div
                        key={key.id}
                        onClick={() => handleToggleGpgSign(key.keyid, gpgSignEnabled)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/5'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            <Key size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{uid.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono block">{uid.email}</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Key ID: {key.keyid}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20">
                            <CheckCircle2 size={13} />
                            <span>{t('security.gpg.activeKey', 'Activa')}</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 3. SECRET SCANNER TAB ─────────────────────────────────────────── */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('security.scanner.title', 'Escáner de Secretos Expuestos')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('security.scanner.subtitle', 'Escanea el repositorio local en busca de API Keys, Tokens de GitHub/GitLab, AWS Keys y Claves Privadas antes de hacer push.')}
                </p>
              </div>

              <button
                onClick={handleScanSecrets}
                disabled={scanningSecrets || !folderPath}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-lg shadow-rose-600/20"
              >
                {scanningSecrets ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                <span>{scanningSecrets ? t('security.scanner.scanning', 'Escaneando...') : t('security.scanner.scanBtn', 'Escanear Repositorio')}</span>
              </button>
            </div>

            {/* Scan Metrics */}
            {scannedFilesCount !== null && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#121b30] border border-slate-800 rounded-xl p-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('security.scanner.metrics.files', 'Archivos Escaneados')}</span>
                  <span className="text-xl font-extrabold text-white font-mono mt-1 block">{scannedFilesCount}</span>
                </div>

                <div className="bg-[#121b30] border border-slate-800 rounded-xl p-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('security.scanner.metrics.secrets', 'Secretos Hallados')}</span>
                  <span className={`text-xl font-extrabold font-mono mt-1 block ${detectedSecrets.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {detectedSecrets.length}
                  </span>
                </div>

                <div className="bg-[#121b30] border border-slate-800 rounded-xl p-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('security.scanner.metrics.lastScan', 'Último Escaneo')}</span>
                  <span className="text-xs font-bold text-slate-300 font-mono mt-2 block">{lastScanTime || '-'}</span>
                </div>
              </div>
            )}

            {/* Findings List */}
            <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('security.scanner.resultsTitle', 'Resultados del Análisis')}
              </h4>

              {scannedFilesCount === null ? (
                <div className="p-10 text-center text-slate-500 text-xs">
                  <ShieldAlert size={40} className="mx-auto mb-2 opacity-30 stroke-[1.5]" />
                  <p>{t('security.scanner.promptScan', 'Haz clic en "Escanear Repositorio" para analizar el código en busca de posibles fugas de seguridad.')}</p>
                </div>
              ) : detectedSecrets.length === 0 ? (
                <div className="p-8 text-center bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs space-y-1">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                  <p className="font-bold">{t('security.scanner.cleanState', '¡Repositorio Limpio!')}</p>
                  <p className="text-[11px] text-emerald-400/80">{t('security.scanner.noSecretsSubtitle', 'No se detectaron claves ni tokens expuestos en el código fuente.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detectedSecrets.map((secret, idx) => (
                    <div
                      key={idx}
                      className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2 hover:border-rose-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={15} className="text-rose-400" />
                          <span className="text-xs font-bold text-rose-300">{secret.type}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                          secret.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {secret.severity}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                        <FileCode size={13} className="text-slate-500" />
                        <span className="font-semibold text-white">{secret.file}</span>
                        <span className="text-slate-500">{t('security.scanner.line', 'línea')} {secret.line}</span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {secret.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 4. 2FA & ACCOUNTS TAB ────────────────────────────────────────── */}
        {activeTab === '2fa' && (
          <div className="space-y-6">
            <div className="bg-[#121b30] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('security.2fa.title', 'Estado de Autenticación de Dos Factores (2FA)')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('security.2fa.subtitle', 'Verifica la seguridad y tipo de autenticación de tus cuentas de proveedor cloud vinculadas.')}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {providers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                    <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
                    <p>{t('security.2fa.noProviders', 'No hay cuentas de GitHub o GitLab conectadas.')}</p>
                  </div>
                ) : (
                  providers.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs uppercase">
                          {p.providerId === 'github' ? 'GH' : 'GL'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{p.accountName}</span>
                          <span className="text-[11px] text-slate-400 font-mono block">{p.providerId.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span>PAT / Token Autenticado</span>
                        </span>
                        <a
                          href={p.providerId === 'github' ? 'https://github.com/settings/two_factor_auth' : 'https://gitlab.com/-/profile/two_factor_auth'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                        >
                          <span>Ajustes 2FA</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal Nueva SSH Key */}
      {showNewSshModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewSshModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">{t('security.ssh.modalTitle', 'Generar Nueva Clave SSH')}</h3>

            <form onSubmit={handleGenerateSshKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('security.ssh.keyName', 'Nombre de la clave')}</label>
                <input
                  type="text"
                  required
                  value={newSshForm.name}
                  onChange={(e) => setNewSshForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('security.ssh.keyNamePlaceholder', 'ej. id_ed25519_mongit')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('security.ssh.keyType', 'Tipo de Clave')}</label>
                <select
                  value={newSshForm.keyType}
                  onChange={(e) => setNewSshForm(prev => ({ ...prev, keyType: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="ed25519">{t('security.ssh.keyTypeEd25519', 'Ed25519 (Recomendado - Ultra Seguro)')}</option>
                  <option value="rsa">{t('security.ssh.keyTypeRsa', 'RSA 4096-bit (Compatibilidad)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('security.ssh.passphrase', 'Contraseña (opcional)')}</label>
                <input
                  type="password"
                  value={newSshForm.passphrase}
                  onChange={(e) => setNewSshForm(prev => ({ ...prev, passphrase: e.target.value }))}
                  placeholder={t('security.ssh.passphrasePlaceholder', 'Dejar en blanco si no deseas passphrase')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSshModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
                >
                  {t('security.ssh.cancelBtn', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={generatingSsh}
                  className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {generatingSsh && <RefreshCw size={12} className="animate-spin" />}
                  <span>{t('security.ssh.generateSubmitBtn', 'Generar')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
