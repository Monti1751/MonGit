// useProviders.js — central state management for all Git provider connections
import { useState, useCallback, useEffect } from 'react'
import {
  PROVIDER_META,
  testConnection,
  fetchRepos,
  fetchBranches,
  fetchCommits,
  createProviderRepo,
} from '../providers/index.js'

const STORAGE_KEY = 'mongit_providers_v1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(providers) {
  try {
    // Only persist id, creds, user — not repos/branches (re-fetched on load)
    const slim = providers.map(({ id, providerId, creds, user, label }) => ({
      id, providerId, creds, user, label,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {
    // ignore storage errors
  }
}

export function useProviders() {
  const [providers, setProviders] = useState([])      // connected accounts
  const [allRepos, setAllRepos] = useState([])        // flat list of all repos
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [errors, setErrors] = useState({})            // providerId → error message

  // ── Bootstrap from localStorage ─────────────────────────────────────────
  useEffect(() => {
    const saved = loadFromStorage()
    if (saved.length === 0) return
    setProviders(saved.map(p => ({ ...p, repos: [], status: 'loading' })))
    // Re-fetch repos for each saved provider
    Promise.allSettled(
      saved.map(p =>
        fetchRepos(p.providerId, p.creds)
          .then(repos => ({ id: p.id, repos, status: 'connected' }))
          .catch(err => ({ id: p.id, repos: [], status: 'error', error: err.message }))
      )
    ).then(results => {
      const repoMap = {}
      const errorMap = {}
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          repoMap[r.value.id] = r.value.repos
          if (r.value.status === 'error') errorMap[r.value.id] = r.value.error
        }
      })
      setProviders(prev =>
        prev.map(p => ({
          ...p,
          repos: repoMap[p.id] || [],
          status: errorMap[p.id] ? 'error' : 'connected',
        }))
      )
      setErrors(errorMap)
    })
  }, [])

  // ── Rebuild allRepos whenever providers change ───────────────────────────
  useEffect(() => {
    const flat = providers.flatMap(p =>
      (p.repos || []).map(r => ({
        ...r,
        providerAccountId: p.id,
        providerLabel: p.label || `${PROVIDER_META[p.providerId]?.name} (${p.user?.login || p.user?.username || p.user?.nickname || '?'})`,
        providerColor: PROVIDER_META[p.providerId]?.color || '#888',
        providerIcon: PROVIDER_META[p.providerId]?.icon || '🔗',
        creds: p.creds,
        // Extra meta needed for GitLab/Bitbucket dispatch
        _meta: {
          projectId: r.projectId,
          workspace: r.workspace,
        },
      }))
    )
    setAllRepos(flat)
  }, [providers])

  // ── Add a new provider account ───────────────────────────────────────────
  const addProvider = useCallback(async (providerId, creds) => {
    const accountId = `${providerId}_${Date.now()}`
    // 1. Test the connection
    const user = await testConnection(providerId, creds)
    // 2. Fetch repos
    const repos = await fetchRepos(providerId, creds)
    const meta = PROVIDER_META[providerId]
    const newProvider = {
      id: accountId,
      providerId,
      creds,
      user,
      label: `${meta.name} (${user.login || user.username || user.nickname || user.display_name || '?'})`,
      repos,
      status: 'connected',
    }
    setProviders(prev => {
      const next = [...prev, newProvider]
      saveToStorage(next)
      return next
    })
    return newProvider
  }, [])

  // ── Remove a provider account ────────────────────────────────────────────
  const removeProvider = useCallback((accountId) => {
    setProviders(prev => {
      const next = prev.filter(p => p.id !== accountId)
      saveToStorage(next)
      return next
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[accountId]
      return next
    })
  }, [])

  // ── Load branches for a given repo ──────────────────────────────────────
  const loadBranches = useCallback(async (repo) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no encontrado')
    return fetchBranches(
      provider.providerId,
      provider.creds,
      repo.owner,
      repo.name,
      repo._meta || {}
    )
  }, [providers])

  // ── Load commits for a given repo + branch ──────────────────────────────
  const loadCommits = useCallback(async (repo, branch) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no encontrado')
    return fetchCommits(
      provider.providerId,
      provider.creds,
      repo.owner,
      repo.name,
      branch,
      repo._meta || {}
    )
  }, [providers])

  // ── Create a new repository ───────────────────────────────────────────────
  const createNewRepo = useCallback(async (accountId, repoDetails) => {
    const provider = providers.find(p => p.id === accountId)
    if (!provider) throw new Error('Proveedor no encontrado')
    
    // Add owner to details specifically for Bitbucket workspace tracking
    repoDetails.owner = provider.user?.login || provider.user?.username || provider.user?.nickname || ''
    
    const meta = { workspace: repoDetails.owner }
    await createProviderRepo(provider.providerId, provider.creds, repoDetails, meta)
    
    // Refresh repos to get the new one
    await refreshProvider(accountId)
  }, [providers])

  // ── Refresh repos for a specific provider ───────────────────────────────
  const refreshProvider = useCallback(async (accountId) => {
    const provider = providers.find(p => p.id === accountId)
    if (!provider) return
    setProviders(prev => prev.map(p => p.id === accountId ? { ...p, status: 'loading' } : p))
    try {
      const repos = await fetchRepos(provider.providerId, provider.creds)
      setProviders(prev => {
        const next = prev.map(p => p.id === accountId ? { ...p, repos, status: 'connected' } : p)
        saveToStorage(next)
        return next
      })
      setErrors(prev => { const n = { ...prev }; delete n[accountId]; return n })
    } catch (err) {
      setErrors(prev => ({ ...prev, [accountId]: err.message }))
      setProviders(prev => prev.map(p => p.id === accountId ? { ...p, status: 'error' } : p))
    }
  }, [providers])

  return {
    providers,
    allRepos,
    loadingRepos,
    errors,
    addProvider,
    removeProvider,
    refreshProvider,
    loadBranches,
    loadCommits,
    createNewRepo,
    hasProviders: providers.length > 0,
  }
}
