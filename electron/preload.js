const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getGitStatus: (folderPath) => ipcRenderer.invoke('get-git-status', folderPath),
  getBranches: (folderPath) => ipcRenderer.invoke('get-branches', folderPath),
  getCommits: (folderPath, branch) => ipcRenderer.invoke('get-commits', folderPath, branch),
  createBranch: (folderPath, branch) => ipcRenderer.invoke('create-branch', folderPath, branch),
  checkoutBranch: (folderPath, branch) => ipcRenderer.invoke('checkout-branch', folderPath, branch),
  commitChanges: (folderPath, files, message) => ipcRenderer.invoke('commit-changes', folderPath, files, message),
  deleteBranch: (folderPath, branch, deleteRemote) => ipcRenderer.invoke('delete-branch', folderPath, branch, deleteRemote),
  pushChanges: (folderPath) => ipcRenderer.invoke('push-changes', folderPath),
  pullChanges: (folderPath) => ipcRenderer.invoke('pull-changes', folderPath),
  checkUnpushedCommits: (folderPath) => ipcRenderer.invoke('check-unpushed-commits', folderPath),
  getMergeStatus: (folderPath) => ipcRenderer.invoke('get-merge-status', folderPath),
  gitMerge: (folderPath, fromBranch) => ipcRenderer.invoke('git-merge', folderPath, fromBranch),
  gitAbortMerge: (folderPath) => ipcRenderer.invoke('git-abort-merge', folderPath),
  readFileContent: (folderPath, filePath) => ipcRenderer.invoke('read-file-content', folderPath, filePath),
  writeFileContent: (folderPath, filePath, content) => ipcRenderer.invoke('write-file-content', folderPath, filePath, content),
  gitStageFile: (folderPath, filePath) => ipcRenderer.invoke('git-stage-file', folderPath, filePath),
  gitCommitMerge: (folderPath, message) => ipcRenderer.invoke('git-commit-merge', folderPath, message)
})
