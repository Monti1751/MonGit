const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getGitStatus: (folderPath) => ipcRenderer.invoke('get-git-status', folderPath),
  commitChanges: (folderPath, files, message) => ipcRenderer.invoke('commit-changes', folderPath, files, message),
  pushChanges: (folderPath) => ipcRenderer.invoke('push-changes', folderPath)
})
