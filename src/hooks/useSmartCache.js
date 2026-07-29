import { useState, useEffect, useRef } from 'react'

export function useSmartCache(dependencyKey, fetcher, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef({})

  useEffect(() => {
    if (!dependencyKey) return

    // Si está en caché, usar inmediatamente
    if (cacheRef.current[dependencyKey]) {
      setData(cacheRef.current[dependencyKey])
      return
    }

    let cancelled = false
    setLoading(true)

    fetcher().then(result => {
      if (!cancelled) {
        cacheRef.current[dependencyKey] = result
        setData(result)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [dependencyKey, ...dependencies])

  const invalidate = () => {
    if (dependencyKey) {
      delete cacheRef.current[dependencyKey]
    }
  }

  return { data, loading, invalidate }
}
