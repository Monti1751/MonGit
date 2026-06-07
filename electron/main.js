import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
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

    let inRebase = false
    try {
      await fs.stat(join(folderPath, '.git', 'rebase-merge'))
      inRebase = true
      console.log(`[get-merge-status] Carpeta rebase-merge encontrada - rebase en progreso`)
    } catch (e) {
      try {
        await fs.stat(join(folderPath, '.git', 'rebase-apply'))
        inRebase = true
        console.log(`[get-merge-status] Carpeta rebase-apply encontrada - rebase en progreso`)
      } catch (e2) {
        inRebase = false
      }
    }

    let conflicts = []
    try {
      const { stdout: conflictOutput } = await execAsync('git diff --name-only --diff-filter=U', { cwd: folderPath })
      conflicts = conflictOutput.split('\n').map(s => s.trim()).filter(Boolean)
      if (conflicts.length > 0) {
        console.log(`[get-merge-status] Conflictos encontrados:`, conflicts)
        if (!inMerge && !inRebase) {
          inMerge = true
        }
      }
    } catch (err) {
      console.log(`[get-merge-status] Error al obtener conflictos:`, err.message)
    }

    console.log(`[get-merge-status] Resultado: inMerge=${inMerge}, inRebase=${inRebase}, conflicts=${conflicts.length}`)
    return { inMerge, inRebase, conflicts }
  } catch (err) {
    console.error('[get-merge-status] Error:', err)
    return { inMerge: false, inRebase: false, conflicts: [] }
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

ipcMain.handle('git-clone', async (event, url, parentFolder, repoName) => {
  try {
    const targetPath = join(parentFolder, repoName)
    try {
      const stat = await fs.stat(targetPath)
      if (stat.isDirectory()) {
        const files = await fs.readdir(targetPath)
        if (files.length > 0) {
          return { success: false, error: 'La carpeta de destino ya existe y no está vacía.' }
        }
      }
    } catch (e) {
      // Folder doesn't exist, fine
    }

    console.log(`[git-clone] Clonando ${url} en ${targetPath}`)
    await execAsync(`git clone "${url}" "${targetPath}"`)
    return { success: true, clonedPath: targetPath }
  } catch (err) {
    console.error('git-clone error:', err)
    return { success: false, error: err.message || 'Error desconocido al clonar' }
  }
})

// ─── Stash ────────────────────────────────────────────────────────────────────

ipcMain.handle('git-stash', async (event, folderPath, message) => {
  try {
    const args = message ? ['push', '-m', message] : ['push']
    const { stdout } = await execAsync(`git stash ${args.map(a => `"${a}"`).join(' ')}`, { cwd: folderPath })
    return { success: true, output: stdout }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

ipcMain.handle('git-stash-list', async (event, folderPath) => {
  try {
    const { stdout } = await execAsync('git stash list --format="%gd|%s|%cr"', { cwd: folderPath })
    const stashes = stdout.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split('|')
      return { ref: parts[0], message: parts[1] || '', date: parts[2] || '' }
    })
    return { success: true, stashes }
  } catch (err) {
    return { success: false, stashes: [], error: err.message }
  }
})

ipcMain.handle('git-stash-apply', async (event, folderPath, index) => {
  try {
    await execAsync(`git stash apply "stash@{${index}}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

ipcMain.handle('git-stash-pop', async (event, folderPath, index) => {
  try {
    await execAsync(`git stash pop "stash@{${index}}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

ipcMain.handle('git-stash-drop', async (event, folderPath, index) => {
  try {
    await execAsync(`git stash drop "stash@{${index}}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

// ─── Cherry-pick ──────────────────────────────────────────────────────────────

ipcMain.handle('git-cherry-pick', async (event, folderPath, commitId, targetBranch) => {
  try {
    // Switch to target branch, cherry-pick, come back
    const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: folderPath })
    const current = currentBranch.trim()
    await execAsync(`git checkout "${targetBranch}"`, { cwd: folderPath })
    try {
      await execAsync(`git cherry-pick "${commitId}"`, { cwd: folderPath })
    } catch (cpErr) {
      // Try to go back even on failure
      await execAsync(`git checkout "${current}"`, { cwd: folderPath }).catch(() => {})
      return { success: false, error: cpErr.stderr || cpErr.message }
    }
    await execAsync(`git checkout "${current}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

// ─── Revert ───────────────────────────────────────────────────────────────────

ipcMain.handle('git-revert', async (event, folderPath, commitId) => {
  try {
    await execAsync(`git revert --no-edit "${commitId}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

// ─── Tags ─────────────────────────────────────────────────────────────────────

ipcMain.handle('git-list-tags', async (event, folderPath) => {
  try {
    const { stdout } = await execAsync('git tag --sort=-version:refname', { cwd: folderPath })
    const tags = stdout.split('\n').filter(t => t.trim())
    return { success: true, tags }
  } catch (err) {
    return { success: false, tags: [], error: err.message }
  }
})

ipcMain.handle('git-create-tag', async (event, folderPath, name, message) => {
  try {
    await execAsync(`git tag -a "${name}" -m "${message}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

ipcMain.handle('git-delete-tag', async (event, folderPath, name) => {
  try {
    await execAsync(`git tag -d "${name}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

ipcMain.handle('git-push-tag', async (event, folderPath, name) => {
  try {
    await execAsync(`git push origin "${name}"`, { cwd: folderPath })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.stderr || err.message }
  }
})

// Helper to clean up rebase files
async function cleanUpRebaseFiles(gitDir) {
  const files = ['mon-git-todo.txt', 'mon-git-rebase-messages.json', 'mon-git-sequence-editor.cjs', 'mon-git-editor.cjs']
  for (const f of files) {
    await fs.unlink(join(gitDir, f)).catch(() => {})
  }
}

// ─── Interactive Rebase ────────────────────────────────────────────────────────

ipcMain.handle('git-interactive-rebase', async (event, folderPath, baseCommit, todoList) => {
  try {
    const gitDir = join(folderPath, '.git')
    
    // Write the todo list
    const todoLines = todoList.map(item => `${item.action} ${item.id}`).join('\n')
    await fs.writeFile(join(gitDir, 'mon-git-todo.txt'), todoLines, 'utf8')
    
    // Write message mappings
    const messagesMap = {}
    todoList.forEach(item => {
      if ((item.action === 'reword' || item.action === 'squash') && item.message) {
        messagesMap[item.id] = item.message
      }
    })
    await fs.writeFile(join(gitDir, 'mon-git-rebase-messages.json'), JSON.stringify(messagesMap), 'utf8')
    
    // Write mon-git-sequence-editor.cjs
    const sequenceEditorCode = `const fs = require('fs');
const path = require('path');

const targetFile = process.argv.find(arg => arg.endsWith('git-rebase-todo'));
if (targetFile) {
  const repoGitDir = path.dirname(path.dirname(targetFile));
  const customTodoPath = path.join(repoGitDir, 'mon-git-todo.txt');
  if (fs.existsSync(customTodoPath)) {
    fs.writeFileSync(targetFile, fs.readFileSync(customTodoPath, 'utf8'), 'utf8');
  }
}
process.exit(0);
`
    await fs.writeFile(join(gitDir, 'mon-git-sequence-editor.cjs'), sequenceEditorCode, 'utf8')
    
    // Write mon-git-editor.cjs
    const gitEditorCode = `const fs = require('fs');
const path = require('path');

const msgFile = process.argv[process.argv.length - 1];
const repoGitDir = path.dirname(path.dirname(msgFile));
const configPath = path.join(repoGitDir, 'mon-git-rebase-messages.json');

if (fs.existsSync(configPath) && fs.existsSync(msgFile)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  let sha = '';
  const stoppedShaPath = path.join(repoGitDir, 'rebase-merge', 'stopped-sha');
  if (fs.existsSync(stoppedShaPath)) {
    sha = fs.readFileSync(stoppedShaPath, 'utf8').trim();
  }
  
  if (sha && config[sha]) {
    fs.writeFileSync(msgFile, config[sha], 'utf8');
  }
}
process.exit(0);
`
    await fs.writeFile(join(gitDir, 'mon-git-editor.cjs'), gitEditorCode, 'utf8')
    
    const env = {
      ...process.env,
      GIT_SEQUENCE_EDITOR: `node "${join(gitDir, 'mon-git-sequence-editor.cjs')}"`,
      GIT_EDITOR: `node "${join(gitDir, 'mon-git-editor.cjs')}"`
    }
    
    try {
      console.log(`[git-interactive-rebase] Running interactive rebase onto ${baseCommit}`)
      const { stdout } = await execAsync(`git rebase -i "${baseCommit}"`, { cwd: folderPath, env })
      await cleanUpRebaseFiles(gitDir).catch(() => {})
      return { success: true, output: stdout }
    } catch (rebaseErr) {
      console.warn('[git-interactive-rebase] Rebase failed or stopped:', rebaseErr.message)
      const inRebaseMerge = await fs.stat(join(gitDir, 'rebase-merge')).then(() => true).catch(() => false)
      const inRebaseApply = await fs.stat(join(gitDir, 'rebase-apply')).then(() => true).catch(() => false)
      
      if (inRebaseMerge || inRebaseApply) {
        return { success: false, conflict: true, error: rebaseErr.stderr || rebaseErr.message }
      }
      
      await cleanUpRebaseFiles(gitDir).catch(() => {})
      return { success: false, error: rebaseErr.stderr || rebaseErr.message }
    }
  } catch (err) {
    console.error('git-interactive-rebase outer error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('git-rebase-continue', async (event, folderPath) => {
  try {
    const gitDir = join(folderPath, '.git')
    const env = {
      ...process.env,
      GIT_EDITOR: 'true'
    }
    const { stdout } = await execAsync('git rebase --continue', { cwd: folderPath, env })
    
    const inRebaseMerge = await fs.stat(join(gitDir, 'rebase-merge')).then(() => true).catch(() => false)
    const inRebaseApply = await fs.stat(join(gitDir, 'rebase-apply')).then(() => true).catch(() => false)
    
    if (!inRebaseMerge && !inRebaseApply) {
      await cleanUpRebaseFiles(gitDir).catch(() => {})
      return { success: true, finished: true }
    }
    return { success: true, finished: false }
  } catch (err) {
    console.error('git-rebase-continue error:', err)
    const gitDir = join(folderPath, '.git')
    const inRebaseMerge = await fs.stat(join(gitDir, 'rebase-merge')).then(() => true).catch(() => false)
    const inRebaseApply = await fs.stat(join(gitDir, 'rebase-apply')).then(() => true).catch(() => false)
    
    if (inRebaseMerge || inRebaseApply) {
      return { success: false, conflict: true, error: err.stderr || err.message }
    }
    return { success: false, error: err.stderr || err.message }
  }
})

ipcMain.handle('git-rebase-abort', async (event, folderPath) => {
  try {
    const gitDir = join(folderPath, '.git')
    await execAsync('git rebase --abort', { cwd: folderPath })
    await cleanUpRebaseFiles(gitDir).catch(() => {})
    return { success: true }
  } catch (err) {
    console.error('git-rebase-abort error:', err)
    return { success: false, error: err.stderr || err.message }
  }
})

// ─────────────────────────────────────────────────────────────────────────────

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

ipcMain.handle('open-external-url', async (event, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (err) {
    console.error('open-external-url error:', err)
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
