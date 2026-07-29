import { parentPort } from 'worker_threads'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

parentPort?.on('message', async (task) => {
  try {
    const { taskId, operation, folderPath, args = [] } = task
    let command = ''

    switch (operation) {
      case 'log':
        command = `git log -n ${args[0] || 100} --pretty=format:"%H|%an|%ae|%ad|%s"`
        break
      case 'status':
        command = 'git status --porcelain'
        break
      case 'branches':
        command = 'git branch -a'
        break
      default:
        command = `git ${operation} ${args.join(' ')}`
    }

    const { stdout } = await execAsync(command, { cwd: folderPath, maxBuffer: 10 * 1024 * 1024 })
    parentPort.postMessage({ success: true, result: stdout, taskId })
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message, taskId: task.taskId })
  }
})
