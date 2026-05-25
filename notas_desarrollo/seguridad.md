# Seguridad y Autenticación

**Ubicación esperada:** `src/components/SecurityPanel.jsx`, `electron/security.js` (nuevos módulos)
**Contexto:** Mejoras de seguridad para autenticación, firmas y detección de vulnerabilidades.

---

## 1. SSH Keys

Soporte para autenticación por SSH.

**Panel de SSH Keys:**
```jsx
// src/components/SSHKeysPanel.jsx
export default function SSHKeysPanel() {
  const [keys, setKeys] = useState([])
  const [showNewKey, setShowNewKey] = useState(false)

  useEffect(() => {
    loadSSHKeys()
  }, [])

  const loadSSHKeys = async () => {
    const keysList = await window.electronAPI.getSSHKeys()
    setKeys(keysList)
  }

  const handleGenerateKey = async (name, passphrase) => {
    try {
      const key = await window.electronAPI.generateSSHKey(name, passphrase)
      setSuccess('✓ SSH Key generada')
      setKeys([...keys, key])
      setShowNewKey(false)
    } catch (err) {
      setError('Error generando SSH Key: ' + err.message)
    }
  }

  const handleDeleteKey = async (keyId) => {
    if (confirm('¿Eliminar esta SSH Key?')) {
      await window.electronAPI.deleteSSHKey(keyId)
      setKeys(keys.filter(k => k.id !== keyId))
    }
  }

  const handleCopyPublicKey = (key) => {
    navigator.clipboard.writeText(key.publicKey)
    setSuccess('✓ Clave pública copiada')
  }

  return (
    <div className="space-y-4 p-4">
      <button
        onClick={() => setShowNewKey(!showNewKey)}
        className="w-full bg-brand-500 hover:bg-brand-600 rounded-lg py-2 text-sm font-medium"
      >
        + Generar nueva SSH Key
      </button>

      {showNewKey && (
        <NewSSHKeyModal onGenerate={handleGenerateKey} onClose={() => setShowNewKey(false)} />
      )}

      <div className="space-y-2">
        {keys.map(key => (
          <div key={key.id} className="bg-slate-800 p-4 rounded-lg">
            <h3 className="font-medium text-white">{key.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Huella: {key.fingerprint}
            </p>
            <p className="text-xs text-slate-400">
              Creada: {new Date(key.created).toLocaleDateString()}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleCopyPublicKey(key)}
                className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded"
              >
                Copiar clave pública
              </button>
              <button
                onClick={() => handleDeleteKey(key.id)}
                className="text-xs px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Electron API:**
```javascript
const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')
const { exec } = require('child_process')

ipcMain.handle('generate-ssh-key', async (event, name, passphrase) => {
  const homeDir = require('os').homedir()
  const sshDir = path.join(homeDir, '.ssh')
  await fs.ensureDir(sshDir)
  
  const keyPath = path.join(sshDir, name)
  const publicKeyPath = keyPath + '.pub'
  
  return new Promise((resolve, reject) => {
    exec(`ssh-keygen -t ed25519 -f "${keyPath}" -N "${passphrase}" -C "MonGit"`, (err) => {
      if (err) reject(err)
      
      const publicKey = fs.readFileSync(publicKeyPath, 'utf-8')
      resolve({
        id: crypto.randomUUID(),
        name,
        publicKey,
        fingerprint: generateFingerprint(publicKey),
        created: new Date()
      })
    })
  })
})
```

---

## 2. GPG Signing

Firmar commits con GPG.

**Panel de GPG:**
```jsx
function GPGPanel() {
  const [gpgKeys, setGpgKeys] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [signCommits, setSignCommits] = useState(false)

  useEffect(() => {
    loadGPGKeys()
  }, [])

  const loadGPGKeys = async () => {
    const keys = await window.electronAPI.getGPGKeys()
    setGpgKeys(keys)
  }

  const handleEnableGPGSigning = async (keyId) => {
    await window.electronAPI.configureGitGPG(keyId)
    setSelectedKey(keyId)
    setSignCommits(true)
    setSuccess('✓ GPG Signing habilitado para commits')
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-white">Firmar commits con GPG</h3>
      
      <div className="space-y-2">
        {gpgKeys.map(key => (
          <div
            key={key.id}
            className={`p-3 rounded-lg cursor-pointer border transition ${
              selectedKey === key.id
                ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
            onClick={() => handleEnableGPGSigning(key.id)}
          >
            <p className="font-medium">{key.uids[0].name}</p>
            <p className="text-xs">{key.uids[0].email}</p>
            <p className="text-xs opacity-75">ID: {key.keyid}</p>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={signCommits}
          onChange={e => setSignCommits(e.target.checked)}
          className="w-4 h-4"
        />
        Firmar todos los commits automáticamente
      </label>
    </div>
  )
}
```

---

## 3. Two-Factor Authentication (2FA)

Verificar soporte para 2FA en proveedores.

```javascript
// En providers/index.js
export const testConnection = async (providerId, credentials) => {
  // Si el proveedor tiene 2FA habilitado, retornar error indicando que se necesita verificación
  try {
    const result = await apiCall(providerId, credentials)
    if (result.requires2FA) {
      return {
        success: false,
        requires2FA: true,
        message: 'Se requiere verificación de dos factores'
      }
    }
    return { success: true }
  } catch (err) {
    if (err.code === 'OTP_REQUIRED') {
      return {
        success: false,
        requires2FA: true,
        message: 'Ingresa tu código de dos factores'
      }
    }
    return { success: false, error: err.message }
  }
}
```

---

## 4. Secret Scanning

Detectar credenciales expuestas en commits.

**Componente SecretScanner:**
```jsx
// src/components/SecretScanner.jsx
export default function SecretScanner({ folderPath }) {
  const [secrets, setSecrets] = useState([])
  const [scanning, setScanning] = useState(false)

  const handleScan = async () => {
    setScanning(true)
    try {
      const detectedSecrets = await window.electronAPI.scanForSecrets(folderPath)
      setSecrets(detectedSecrets)
      
      if (detectedSecrets.length > 0) {
        setError(`⚠️ Se detectaron ${detectedSecrets.length} posibles secretos expuestos`)
      } else {
        setSuccess('✓ No se encontraron secretos expuestos')
      }
    } catch (err) {
      setError('Error escaneando secretos: ' + err.message)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <button
        onClick={handleScan}
        disabled={scanning}
        className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 rounded-lg py-2"
      >
        {scanning ? 'Escaneando...' : 'Escanear Secretos'}
      </button>

      {secrets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-rose-400">Secretos Detectados:</h3>
          {secrets.map((secret, i) => (
            <div key={i} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg text-xs text-rose-300">
              <p><strong>Tipo:</strong> {secret.type} ({secret.pattern})</p>
              <p><strong>Archivo:</strong> {secret.file}</p>
              <p><strong>Línea:</strong> {secret.line}</p>
              <p><strong>Commit:</strong> {secret.commit}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Electron API (usando librería `detect-secrets`):**
```javascript
ipcMain.handle('scan-for-secrets', async (event, path) => {
  const { execSync } = require('child_process')
  try {
    const result = execSync(`detect-secrets scan --baseline .secrets.baseline "${path}"`, { encoding: 'utf-8' })
    const detected = JSON.parse(result)
    return detected.results || []
  } catch (err) {
    return []
  }
})
```

---

*Nota: Para SSH key generation, requiere `ssh-keygen` disponible en el sistema. GPG Signing requiere GPG instalado. Secret scanning puede usar `detect-secrets` o `truffleHog`.*
