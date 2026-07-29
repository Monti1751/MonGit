import { useState, useCallback } from 'react'

export function useRepoCache(folderPath) {
  const [cache, setCache] = useState({})
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  const getCachedData = useCallback(async (key, fetcher) => {
    const fullKey = `${folderPath}:${key}`
    const cached = cache[fullKey]
    
    // Si está en caché y no expiró, retornar
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    // Si no, fetchear y cachear
    const data = await fetcher()
    setCache(prev => ({
      ...prev,
      [fullKey]: { data, timestamp: Date.now() }
    }))
    return data
  }, [folderPath, cache])

  const invalidateCache = useCallback((key) => {
    const fullKey = key ? `${folderPath}:${key}` : null
    setCache(prev => {
      if (!key) return {}
      const updated = { ...prev }
      delete updated[fullKey]
      return updated
    })
  }, [folderPath])

  return { getCachedData, invalidateCache, cache }
}
