// useProviders.js — central state management for all Git provider connections
import { useState, useCallback, useEffect } from 'react'
import {
  PROVIDER_META,
  testConnection,
  fetchRepos,
  fetchBranches,
  fetchCommits,
  createProviderRepo,
  fetchPullRequests,
  createPullRequest,
  mergePullRequest,
  fetchPRComments,
  createPRComment,
  fetchPRCheckRuns,
  fetchPRFiles,
  fetchIssues,
  createNewIssue,
  updateIssueState,
  updateIssueAssignee,
  fetchIssueComments,
  createNewIssueComment,
  fetchRepoLabels,
  fetchRepoCollaborators,
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

  // ── Pull Requests / Merge Requests ─────────────────────────────────────────
  const getPullRequests = useCallback(async (repo, state) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchPullRequests(provider.providerId, provider.creds, repo.owner, repo.name, state, repo._meta || {})
  }, [providers])

  const createPR = useCallback(async (repo, details) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return createPullRequest(provider.providerId, provider.creds, repo.owner, repo.name, details, repo._meta || {})
  }, [providers])

  const mergePR = useCallback(async (repo, prNumber) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return mergePullRequest(provider.providerId, provider.creds, repo.owner, repo.name, prNumber, repo._meta || {})
  }, [providers])

  const getPRCommentsData = useCallback(async (repo, prNumber) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchPRComments(provider.providerId, provider.creds, repo.owner, repo.name, prNumber, repo._meta || {})
  }, [providers])

  const createPRCommentData = useCallback(async (repo, prNumber, body, inlineDetails) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return createPRComment(provider.providerId, provider.creds, repo.owner, repo.name, prNumber, body, inlineDetails, repo._meta || {})
  }, [providers])

  const getPRCheckRunsData = useCallback(async (repo, ref) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchPRCheckRuns(provider.providerId, provider.creds, repo.owner, repo.name, ref, repo._meta || {})
  }, [providers])

  const getPRFilesData = useCallback(async (repo, prNumber) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchPRFiles(provider.providerId, provider.creds, repo.owner, repo.name, prNumber, repo._meta || {})
  }, [providers])

  // ── Issues ─────────────────────────────────────────────────────────────────
  const getIssues = useCallback(async (repo, state, labels) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchIssues(provider.providerId, provider.creds, repo.owner, repo.name, state, labels, repo._meta || {})
  }, [providers])

  const createIssue = useCallback(async (repo, details) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return createNewIssue(provider.providerId, provider.creds, repo.owner, repo.name, details, repo._meta || {})
  }, [providers])

  const changeIssueState = useCallback(async (repo, issueNumber, state) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return updateIssueState(provider.providerId, provider.creds, repo.owner, repo.name, issueNumber, state, repo._meta || {})
  }, [providers])

  const assignIssue = useCallback(async (repo, issueNumber, assignees) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return updateIssueAssignee(provider.providerId, provider.creds, repo.owner, repo.name, issueNumber, assignees, repo._meta || {})
  }, [providers])

  const getIssueCommentsData = useCallback(async (repo, issueNumber) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchIssueComments(provider.providerId, provider.creds, repo.owner, repo.name, issueNumber, repo._meta || {})
  }, [providers])

  const createIssueCommentData = useCallback(async (repo, issueNumber, body) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return createNewIssueComment(provider.providerId, provider.creds, repo.owner, repo.name, issueNumber, body, repo._meta || {})
  }, [providers])

  const getLabels = useCallback(async (repo) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchRepoLabels(provider.providerId, provider.creds, repo.owner, repo.name, repo._meta || {})
  }, [providers])

  const getCollaborators = useCallback(async (repo) => {
    const provider = providers.find(p => p.id === repo.providerAccountId)
    if (!provider) throw new Error('Proveedor no conectado')
    return fetchRepoCollaborators(provider.providerId, provider.creds, repo.owner, repo.name, repo._meta || {})
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
    getPullRequests,
    createPR,
    mergePR,
    getPRComments: getPRCommentsData,
    createPRComment: createPRCommentData,
    getPRCheckRuns: getPRCheckRunsData,
    getPRFiles: getPRFilesData,
    getIssues,
    createIssue,
    changeIssueState,
    assignIssue,
    getIssueComments: getIssueCommentsData,
    createIssueComment: createIssueCommentData,
    getLabels,
    getCollaborators,
    hasProviders: providers.length > 0,
  }
}
