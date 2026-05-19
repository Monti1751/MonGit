import { useState } from 'react'
import {
  X, CheckCircle2, AlertCircle, ExternalLink,
  RefreshCw, Trash2, Plus, ChevronLeft, Shield,
  Eye, EyeOff, Wifi, WifiOff, User
} from 'lucide-react'
import { PROVIDER_META, testConnection } from '../providers/index.js'

const PROVIDER_ORDER = ['github', 'gitlab', 'bitbucket', 'codeberg', 'gitea']

// ─── Provider card shown in the selection step ────────────────────────────────
function ProviderCard({ meta, connectedAccounts, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200 hover:scale-105 text-center"
      style={{
        background: meta.bgColor,
        borderColor: connectedAccounts.length ? meta.color + '80' : '#334155',
      }}
    >
      {connectedAccounts.length > 0 && (
        <div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: meta.color }}
        >
          {connectedAccounts.length}
        </div>
      )}
      <span className="text-3xl">{meta.icon}</span>
      <div>
        <p className="font-semibold text-white text-sm">{meta.name}</p>
        {connectedAccounts.length > 0 ? (
          <p className="text-xs mt-0.5" style={{ color: meta.color }}>
            {connectedAccounts.length} cuenta{connectedAccounts.length > 1 ? 's' : ''} conectada{connectedAccounts.length > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-0.5">No conectado</p>
        )}
      </div>
      <div
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: meta.color + '20', color: meta.color }}
      >
        <Plus size={11} />
        Añadir cuenta
      </div>
    </button>
  )
}

// ─── Connected account row in the "Manage" view ───────────────────────────────
function AccountRow({ provider, account, onRemove, onRefresh }) {
  const meta = PROVIDER_META[account.providerId]
  const user = account.user
  const displayName = user?.login || user?.username || user?.nickname || user?.name || '?'
  const avatar = user?.avatar_url || user?.avatar?.href || null

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{ borderColor: meta.color + '30', background: meta.bgColor }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold overflow-hidden"
        style={{ backgroundColor: meta.color + '30', color: meta.color }}
      >
        {avatar
          ? <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
          : displayName[0]?.toUpperCase()
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">@{displayName}</p>
        <p className="text-xs text-slate-500">{account.repos?.length ?? 0} repositorios</p>
      </div>
      <button
        onClick={() => onRefresh(account.id)}
        title="Actualizar repositorios"
        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
      >
        <RefreshCw size={13} className={account.status === 'loading' ? 'animate-spin' : ''} />
      </button>
      <button
        onClick={() => onRemove(account.id)}
        title="Desconectar cuenta"
        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── The credential form for a specific provider ──────────────────────────────
function ConnectForm({ providerId, onConnect, onBack }) {
  const meta = PROVIDER_META[providerId]
  const [fields, setFields] = useState(
    Object.fromEntries(meta.fields.map(f => [f.key, '']))
  )
  const [showPasswords, setShowPasswords] = useState({})
  const [status, setStatus] = useState('idle') // idle | testing | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [testUser, setTestUser] = useState(null)

  const setField = (key, val) => setFields(prev => ({ ...prev, [key]: val }))
  const toggleShow = (key) => setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }))

  const allFilled = meta.fields.every(f => fields[f.key]?.trim())

  const handleTest = async () => {
    setStatus('testing')
    setErrorMsg('')
    setTestUser(null)
    try {
      const creds = providerId === 'bitbucket'
        ? { username: fields.username, appPassword: fields.appPassword }
        : providerId === 'gitea'
        ? { url: fields.url, token: fields.token }
        : { token: fields.token }
      const user = await testConnection(providerId, creds)
      setTestUser(user)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Error de conexión')
    }
  }

  const handleConnect = async () => {
    setStatus('connecting')
    try {
      const creds = providerId === 'bitbucket'
        ? { username: fields.username, appPassword: fields.appPassword }
        : providerId === 'gitea'
        ? { url: fields.url, token: fields.token }
        : { token: fields.token }
      await onConnect(providerId, creds)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Error al guardar la conexión')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h3 className="font-semibold text-white">Conectar {meta.name}</h3>
            <p className="text-xs text-slate-400">Autenticación por token personal</p>
          </div>
        </div>
      </div>

      {/* Token help link */}
      {meta.tokenHelp && (
        <a
          href={meta.tokenHelp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm transition-all hover:opacity-80"
          style={{ borderColor: meta.color + '50', color: meta.color, background: meta.bgColor }}
        >
          <ExternalLink size={14} />
          {meta.tokenHelpText || `Obtener token de ${meta.name}`}
          <span className="ml-auto text-xs opacity-60">Se abre en el navegador</span>
        </a>
      )}

      {/* Gitea URL hint */}
      {providerId === 'gitea' && (
        <div className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400">
          💡 Introduce la URL raíz de tu instancia, p.ej. <code className="text-green-400">https://git.miserver.com</code>.<br />
          Luego crea el token en <code className="text-green-400">/user/settings/applications</code>.
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3">
        {meta.fields.map(field => (
          <div key={field.key}>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              {field.label}
            </label>
            <div className="relative">
              <input
                type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                value={fields[field.key]}
                onChange={e => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 transition-all pr-10"
                style={{ '--tw-ring-color': meta.color + '60' }}
                onFocus={e => e.target.style.borderColor = meta.color + '80'}
                onBlur={e => e.target.style.borderColor = ''}
                onKeyDown={e => e.key === 'Enter' && allFilled && status === 'idle' && handleTest()}
              />
              {field.type === 'password' && (
                <button
                  onClick={() => toggleShow(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPasswords[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-300/80">
        <Shield size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Tu token se guarda en <strong>localStorage</strong> de este navegador y <strong>nunca</strong> sale de tu ordenador salvo para comunicarse directamente con {meta.name}.
        </span>
      </div>

      {/* Status feedback */}
      {status === 'success' && testUser && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-300">¡Conexión exitosa!</p>
            <p className="text-xs text-emerald-400/70 truncate">
              Conectado como @{testUser.login || testUser.username || testUser.nickname || testUser.display_name}
            </p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10">
          <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-300">Error de conexión</p>
            <p className="text-xs text-rose-400/70 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        {status !== 'success' ? (
          <button
            onClick={handleTest}
            disabled={!allFilled || status === 'testing'}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700/50 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'testing'
              ? <><RefreshCw size={14} className="animate-spin" /> Probando…</>
              : <><Wifi size={14} /> Probar conexión</>}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={status === 'connecting' || status === 'done'}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-lg disabled:opacity-60"
            style={{ backgroundColor: meta.color }}
          >
            {status === 'connecting'
              ? <><RefreshCw size={14} className="animate-spin" /> Guardando…</>
              : <><CheckCircle2 size={14} /> Guardar y conectar</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ProviderSetup({ providers, onAdd, onRemove, onRefresh, onClose }) {
  const [step, setStep] = useState('list') // 'list' | providerId
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async (providerId, creds) => {
    setConnecting(true)
    try {
      await onAdd(providerId, creds)
      setStep('list')
    } finally {
      setConnecting(false)
    }
  }

  const totalAccounts = providers.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step === 'list' ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center">
              <User size={15} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Cuentas conectadas</h2>
              <p className="text-xs text-slate-400">
                {totalAccounts === 0 ? 'Ninguna cuenta conectada aún' : `${totalAccounts} cuenta${totalAccounts > 1 ? 's' : ''} activa${totalAccounts > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {step === 'list' ? (
            <div className="space-y-6">
              {/* Connected accounts */}
              {providers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Cuentas activas</p>
                  {providers.map(account => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onRemove={onRemove}
                      onRefresh={onRefresh}
                    />
                  ))}
                </div>
              )}

              {/* Provider selection grid */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  {providers.length > 0 ? 'Añadir otra cuenta' : 'Conecta tu primera cuenta'}
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {PROVIDER_ORDER.map(id => (
                    <ProviderCard
                      key={id}
                      meta={PROVIDER_META[id]}
                      connectedAccounts={providers.filter(p => p.providerId === id)}
                      onClick={() => setStep(id)}
                    />
                  ))}
                </div>
              </div>

              {providers.length === 0 && (
                <div className="text-center py-4">
                  <WifiOff size={28} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Conecta una cuenta para ver tus repositorios reales</p>
                  <p className="text-xs text-slate-600 mt-1">Mientras tanto, MonGit funciona con datos de ejemplo</p>
                  <p className="text-xs text-slate-600 max-w-xs mt-3 text-center px-4 mx-auto border-t border-slate-700/50 pt-3">
                    Tus credenciales se guardan localmente en tu navegador y nunca se envían a los servidores de MonGit.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ConnectForm
              providerId={step}
              onConnect={handleConnect}
              onBack={() => setStep('list')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
