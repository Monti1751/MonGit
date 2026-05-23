import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)

// Setup IPC handlers
ipcMain.handle('select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (!canceled && filePaths.length > 0) {
    return filePaths[0]
  }
  return null
})

ipcMain.handle('get-git-status', async (event, folderPath) => {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: folderPath })
    const files = stdout.split('\n').filter(line => line.trim() !== '').map(line => {
      const status = line.substring(0, 2)
      const path = line.substring(3)
      return { status, path }
    })
    return files
  } catch (err) {
    console.error('get-git-status error:', err)
    return null
  }
})

ipcMain.handle('get-branches', async (event, folderPath) => {
  try {
    const { stdout } = await execAsync('git branch', { cwd: folderPath })
    const branches = []
    let activeBranch = 'main'
    stdout.split('\n').forEach(line => {
      if (line.trim() === '') return
      const isCurrent = line.startsWith('*')
      const name = line.replace('*', '').trim()
      branches.push(name)
      if (isCurrent) activeBranch = name
    })
    return { branches, activeBranch }
  } catch (err) {
    console.error('get-branches error:', err)
    return { branches: [], activeBranch: '' }
  }
})

ipcMain.handle('get-commits', async (event, folderPath, branchName) => {
  try {
    const { stdout } = await execAsync(`git log "${branchName}" --pretty=format:"%H|%s|%an|%ar|%d" -n 50`, { cwd: folderPath })
    const commits = stdout.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split('|')
      const msg = parts[1] || ''
      const isMerge = msg.toLowerCase().startsWith('merge ') || msg.toLowerCase().includes('merge branch') || msg.toLowerCase().includes('merge pull request')
      const deco = parts[4] ? parts[4].trim() : ''
      let tags = []
      if (deco) {
        const cleanDeco = deco.replace(/^\((.*)\)$/, '$1')
        cleanDeco.split(',').forEach(t => {
          const name = t.trim()
          if (name.includes('->')) {
            name.split('->').forEach(part => {
              const p = part.trim()
              if (p && !tags.includes(p)) tags.push(p)
            })
          } else {
            if (name && !tags.includes(name)) tags.push(name)
          }
        })
      }

      return {
        id: parts[0],
        message: msg,
        author: parts[2],
        time: parts[3],
        branch: branchName,
        tags: tags,
        initials: parts[2].substring(0, 2).toUpperCase(),
        color: isMerge ? '#a855f7' : '#14b8a6',
        isMerge: isMerge
      }
    })
    return commits
  } catch (err) {
    console.error('get-commits error:', err)
    return []
  }
})

ipcMain.handle('create-branch', async (event, folderPath, branchName) => {
  try {
    await execAsync(`git checkout -b "${branchName}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('checkout-branch', async (event, folderPath, branchName) => {
  try {
    await execAsync(`git checkout "${branchName}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-branch', async (event, folderPath, branchName, deleteRemote = false) => {
  try {
    // -D forces deletion even if branch has unmerged changes
    await execAsync(`git branch -D "${branchName}"`, { cwd: folderPath })
    
    if (deleteRemote) {
      try {
        await execAsync(`git push origin --delete "${branchName}"`, { cwd: folderPath })
      } catch (remoteErr) {
        console.error('delete-branch remote error:', remoteErr)
        return { success: true, remoteError: remoteErr.message }
      }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('commit-changes', async (event, folderPath, files, message) => {
  try {
    for (const file of files) {
      await execAsync(`git add "${file}"`, { cwd: folderPath })
    }
    const cleanMessage = message.replace(/"/g, '\\"')
    await execAsync(`git commit -m "${cleanMessage}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('push-changes', async (event, folderPath, branchName) => {
  try {
    let activeBranch = branchName;
    if (!activeBranch) {
      const { stdout: branchStdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: folderPath });
      activeBranch = branchStdout.trim();
    }

    try {
      await execAsync(`git push origin "${activeBranch}"`, { cwd: folderPath });
      return { success: true };
    } catch (pushErr) {
      const stderr = pushErr.stderr || '';
      if (stderr.includes('fetch first') || stderr.includes('non-fast-forward')) {
        await execAsync(`git pull --rebase origin "${activeBranch}"`, { cwd: folderPath });
        await execAsync(`git push origin "${activeBranch}"`, { cwd: folderPath });
        return { success: true };
      }
      throw pushErr;
    }
  } catch (err) {
    console.error('push-changes error:', err);
    return { success: false, error: err.message || 'Unknown error during push' };
  }
});

ipcMain.handle('check-unpushed-commits', async (event, folderPath) => {
  try {
    // Check if there is an upstream tracking branch
    await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: folderPath })
    // If yes, count commits ahead of remote
    const { stdout } = await execAsync('git rev-list --count @{u}..HEAD', { cwd: folderPath })
    return parseInt(stdout.trim(), 10) > 0
  } catch (e) {
    // If no upstream tracking branch, check if there are any commits at all in HEAD
    try {
      const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: folderPath })
      return parseInt(stdout.trim(), 10) > 0
    } catch (err) {
      return false
    }
  }
})

ipcMain.handle('pull-changes', async (event, folderPath) => {
  try {
    let hasUpstream = true
    try {
      await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: folderPath })
    } catch (e) {
      hasUpstream = false
    }

    if (hasUpstream) {
      await execAsync('git pull', { cwd: folderPath })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('get-merge-status', async (event, folderPath) => {
  try {
    console.log(`[get-merge-status] Verificando estado de merge en ${folderPath}`)
    
    let inMerge = false
    try {
      await fs.stat(join(folderPath, '.git', 'MERGE_HEAD'))
      inMerge = true
      console.log(`[get-merge-status] MERGE_HEAD encontrado - merge en progreso`)
    } catch (e) {
      inMerge = false
      console.log(`[get-merge-status] No hay MERGE_HEAD`)
    }

    let conflicts = []
    try {
      const { stdout: conflictOutput } = await execAsync('git diff --name-only --diff-filter=U', { cwd: folderPath })
      conflicts = conflictOutput.split('\n').map(s => s.trim()).filter(Boolean)
      if (conflicts.length > 0) {
        console.log(`[get-merge-status] Conflictos encontrados:`, conflicts)
        inMerge = true
      }
    } catch (err) {
      console.log(`[get-merge-status] Error al obtener conflictos:`, err.message)
    }

    console.log(`[get-merge-status] Resultado: inMerge=${inMerge}, conflicts=${conflicts.length}`)
    return { inMerge, conflicts }
  } catch (err) {
    console.error('[get-merge-status] Error:', err)
    return { inMerge: false, conflicts: [] }
  }
})

ipcMain.handle('get-remote-url', async (event, folderPath) => {
  try {
    const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: folderPath })
    const url = stdout.trim()
    return { success: true, url }
  } catch (err) {
    return { success: false, url: null }
  }
})

ipcMain.handle('git-diff-branches', async (event, folderPath, branch1, branch2) => {
  try {
    const { stdout } = await execAsync(`git diff ${branch1}...${branch2}`, { cwd: folderPath })
    return { success: true, diff: stdout }
  } catch (err) {
    return { success: false, diff: '', error: err.message }
  }
})

ipcMain.handle('git-merge', async (event, folderPath, fromBranch) => {
  try {
    console.log(`[git-merge] Iniciando merge de ${fromBranch} en ${folderPath}`)
    const { stdout, stderr } = await execAsync(`git merge --no-ff "${fromBranch}"`, { cwd: folderPath })
    console.log(`[git-merge] Merge exitoso. stdout:`, stdout)
    return { success: true, conflict: false, error: null }
  } catch (err) {
    console.log(`[git-merge] Error en merge. Verificando conflictos...`)
    // Check if there are conflicts
    try {
      const { stdout: conflictOutput } = await execAsync('git diff --name-only --diff-filter=U', { cwd: folderPath })
      const conflicts = conflictOutput.split('\n').map(s => s.trim()).filter(Boolean)
      
      if (conflicts.length > 0) {
        console.log(`[git-merge] Conflictos encontrados:`, conflicts)
        return { 
          success: false, 
          conflict: true, 
          error: 'Existen conflictos de fusión. Por favor, resuélvelos.' 
        }
      }
    } catch (diffErr) {
      console.log(`[git-merge] Error al verificar conflictos:`, diffErr.message)
    }
    
    // If no conflicts detected, it's a real error
    console.log(`[git-merge] Error real:`, err.message)
    return { 
      success: false, 
      conflict: false, 
      error: err.message || 'Error desconocido en git merge' 
    }
  }
})

ipcMain.handle('git-abort-merge', async (event, folderPath) => {
  try {
    await execAsync('git merge --abort', { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('read-file-content', async (event, folderPath, filePath) => {
  try {
    const fullPath = join(folderPath, filePath)
    const content = await fs.readFile(fullPath, 'utf-8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('write-file-content', async (event, folderPath, filePath, content) => {
  try {
    const fullPath = join(folderPath, filePath)
    await fs.writeFile(fullPath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('git-stage-file', async (event, folderPath, filePath) => {
  try {
    await execAsync(`git add "${filePath}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('git-commit-merge', async (event, folderPath, message) => {
  try {
    const cleanMessage = message.replace(/"/g, '\\"')
    await execAsync(`git commit -m "${cleanMessage}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('package-app', async () => {
  try {
    const cwd = join(__dirname, '..')
    await execAsync('npm run dist', { cwd })
    return { success: true }
  } catch (err) {
    console.error('Package app error:', err)
    return { success: false, error: err.message }
  }
})

const __dirname = dirname(fileURLToPath(import.meta.url))

// Set application name for Windows to correctly display in taskbar
app.setAppUserModelId('MonGit')

let win = null

async function createWindow() {
  win = new BrowserWindow({
    title: 'MonGit',
    width: 1200,
    height: 800,
    icon: join(__dirname, '../public/favicon.svg'),
    webPreferences: {
      preload: join(__dirname, '../dist-electron/preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    // Optional: Hide default menu bar for a cleaner "app" look
    autoHideMenuBar: true,
  })

  // In development, Vite sets process.env.VITE_DEV_SERVER_URL
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools()
  } else {
    // In production, load the built index.html
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
