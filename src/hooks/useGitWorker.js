import { useState, useCallback } from 'react'

export function useGitWorker() {
  const executeGitTask = useCallback((operation, folderPath, args = []) => {
    return new Promise((resolve, reject) => {
      if (window.electronAPI?.runGitWorkerTask) {
        window.electronAPI.runGitWorkerTask(operation, folderPath, args)
          .then(resolve)
          .catch(reject)
      } else {
        // Fallback a ejecución síncrona
        reject(new Error('Git Worker not available'))
      }
    })
  }, [])

  return { executeGitTask }
}
