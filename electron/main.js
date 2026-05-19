import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

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
    const { stdout } = await execAsync(`git log "${branchName}" --pretty=format:"%H|%s|%an|%ar" -n 50`, { cwd: folderPath })
    const commits = stdout.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split('|')
      return {
        id: parts[0],
        message: parts[1],
        author: parts[2],
        time: parts[3],
        branch: branchName,
        tags: [],
        initials: parts[2].substring(0, 2).toUpperCase(),
        color: '#14b8a6'
      }
    })
    // Tag first as HEAD
    if (commits.length > 0) commits[0].tags = ['HEAD']
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

ipcMain.handle('push-changes', async (event, folderPath) => {
  try {
    await execAsync('git push', { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('pull-changes', async (event, folderPath) => {
  try {
    await execAsync('git pull', { cwd: folderPath })
    return { success: true }
  } catch (err) {
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
