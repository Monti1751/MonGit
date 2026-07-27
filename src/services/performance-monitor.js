export class PerformanceMonitor {
  static measureOperation(name, fn) {
    const start = performance.now()
    const result = fn()
    const duration = performance.now() - start

    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)

    if (duration > 1000) {
      window.electronAPI?.reportSlowOperation?.(name, duration)
    }

    return result
  }

  static async measureAsync(name, fn) {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start

    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)

    if (duration > 1000) {
      window.electronAPI?.reportSlowOperation?.(name, duration)
    }

    return result
  }
}
