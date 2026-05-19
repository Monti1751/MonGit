const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getGitStatus: (folderPath) => ipcRenderer.invoke('get-git-status', folderPath),
  getBranches: (folderPath) => ipcRenderer.invoke('get-branches', folderPath),
  getCommits: (folderPath, branch) => ipcRenderer.invoke('get-commits', folderPath, branch),
  createBranch: (folderPath, branch) => ipcRenderer.invoke('create-branch', folderPath, branch),
  checkoutBranch: (folderPath, branch) => ipcRenderer.invoke('checkout-branch', folderPath, branch),
  commitChanges: (folderPath, files, message) => ipcRenderer.invoke('commit-changes', folderPath, files, message),
  pushChanges: (folderPath) => ipcRenderer.invoke('push-changes', folderPath),
  pullChanges: (folderPath) => ipcRenderer.invoke('pull-changes', folderPath)
})
