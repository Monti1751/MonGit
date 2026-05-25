# Operaciones Git Avanzadas

**Ubicación esperada:** `src/components/GitOperations.jsx` (nuevo componente)
**Contexto:** Estas operaciones se pueden integrar como un nuevo panel o modal accesible desde el menú principal.

---

## 1. Stash (Guardar Cambios Temporalmente)

Funcionalidad para guardar cambios sin commitear y restaurarlos después.

**Propósito:** Cambiar de rama sin perder cambios locales.

**Componentes necesarios:**
- Panel de Stash en sidebar
- Modal para crear stash con mensaje
- Listado de stashes guardados
- Botones: Aplicar stash, Eliminar stash, Pop stash

**Código ejemplo para LocalRepoPanel:**
```jsx
// En src/components/LocalRepoPanel.jsx
const handleCreateStash = async () => {
  if (!folderPath || !window.electronAPI) return
  try {
    const message = prompt('Mensaje para el stash:')
    if (message) {
      const result = await window.electronAPI.gitStash(folderPath, message)
      setSuccess(`✓ Stash guardado: "${message}"`)
    }
  } catch (err) {
    setError(t('errors.stashFailed') + ': ' + err.message)
  }
}

const handleApplyStash = async (stashIndex) => {
  try {
    await window.electronAPI.gitStashApply(folderPath, stashIndex)
    setSuccess(`✓ Stash aplicado`)
    onRefreshDone?.()
  } catch (err) {
    setError(t('errors.applyStashFailed'))
  }
}
```

**Electron API (en electron/main.js):**
```javascript
ipcMain.handle('git-stash', async (event, path, message) => {
  const git = simpleGit(path)
  return await git.stash(['save', message])
})

ipcMain.handle('git-stash-apply', async (event, path, index) => {
  const git = simpleGit(path)
  return await git.stash(['apply', `stash@{${index}}`])
})

ipcMain.handle('git-stash-list', async (event, path) => {
  const git = simpleGit(path)
  return await git.stashList()
})
```

---

## 2. Rebase Interactivo

Reescribir el histórico de commits para limpiar el repositorio.

**Propósito:** Squash commits, editar mensajes, reorganizar commits.

**Modal de Rebase:**
```jsx
function RebaseModal({ onClose, onRebase, branchName }) {
  const { t } = useTranslation()
  const [commits, setCommits] = useState([])
  const [action, setAction] = useState('squash') // squash, reword, drop, fixup
  
  return (
    <Modal title="Rebase Interactivo" onClose={onClose}>
      {/* Listado de commits con opciones */}
      {/* Selector de acción: squash, reword, drop, fixup */}
      {/* Botón confirmar */}
    </Modal>
  )
}
```

---

## 3. Cherry-pick

Aplicar commits específicos a otra rama.

**Propósito:** Llevar fixes o features específicas entre ramas sin mergear todo.

**Interfaz:**
```jsx
const handleCherryPick = async (commitId, targetBranch) => {
  try {
    await window.electronAPI.gitCherryPick(folderPath, commitId, targetBranch)
    setSuccess(`✓ Commit ${commitId} aplicado a ${targetBranch}`)
  } catch (err) {
    setError(t('errors.cherryPickFailed'))
  }
}
```

---

## 4. Revert (Deshacer Commits)

Crear un nuevo commit que deshace los cambios de un commit anterior.

**Propósito:** Deshacer cambios manteniendo el histórico.

**Botón en commit:**
```jsx
<button 
  onClick={() => handleRevert(commit.id)}
  className="p-2 hover:bg-slate-700 rounded-lg"
  title="Revert this commit"
>
  <RotateCcw size={16} />
</button>

const handleRevert = async (commitId) => {
  if (confirm('¿Deshacer este commit? Se creará un nuevo commit de reversión.')) {
    await window.electronAPI.gitRevert(folderPath, commitId)
    setSuccess(`✓ Commit revertido`)
  }
}
```

---

## 5. Gestión de Tags

Crear, eliminar y visualizar etiquetas de versión.

**Componente TagsPanel:**
```jsx
// src/components/TagsPanel.jsx
function TagsPanel({ folderPath }) {
  const [tags, setTags] = useState([])
  const [showCreateTag, setShowCreateTag] = useState(false)
  
  const handleCreateTag = async (tagName, message) => {
    await window.electronAPI.gitTag(folderPath, tagName, message)
    setTags(await window.electronAPI.gitListTags(folderPath))
  }
  
  const handleDeleteTag = async (tagName) => {
    await window.electronAPI.gitDeleteTag(folderPath, tagName)
    setTags(await window.electronAPI.gitListTags(folderPath))
  }
}
```

**Electron API:**
```javascript
ipcMain.handle('git-tag', async (event, path, name, message) => {
  const git = simpleGit(path)
  return await git.tag(['-a', name, '-m', message])
})

ipcMain.handle('git-delete-tag', async (event, path, name) => {
  const git = simpleGit(path)
  return await git.tag(['-d', name])
})

ipcMain.handle('git-list-tags', async (event, path) => {
  const git = simpleGit(path)
  return await git.tags()
})
```

---

*Nota: Estas características deben integrarse como nuevas opciones en el menú principal y/o como componentes en los paneles existentes.*
