// GitHub API client
// Docs: https://docs.github.com/en/rest

const BASE = 'https://api.github.com'

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function getUser(token) {
  const res = await fetch(`${BASE}/user`, { headers: headers(token) })
  if (!res.ok) throw new Error(`Token inválido (${res.status})`)
  return res.json()
}

export async function getRepos(token) {
  const all = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${BASE}/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator`,
      { headers: headers(token) }
    )
    if (!res.ok) throw new Error(`Error cargando repos (${res.status})`)
    const batch = await res.json()
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.map(r => ({
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    private: r.private,
    description: r.description,
    defaultBranch: r.default_branch,
    updatedAt: r.pushed_at,
    url: r.html_url,
    provider: 'github',
  }))
}

export async function getBranches(token, owner, repo) {
  const all = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
      { headers: headers(token) }
    )
    if (!res.ok) throw new Error(`Error cargando ramas (${res.status})`)
    const batch = await res.json()
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.map(b => ({
    name: b.name,
    sha: b.commit.sha,
    protected: b.protected,
  }))
}

export async function getCommits(token, owner, repo, branch = 'main', perPage = 20) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`, {
    headers: headers(token)
  })
  if (res.status === 409) return [] // Empty repository
  if (!res.ok) throw new Error(`Error cargando commits (${res.status})`)
  const data = await res.json()
  return data.map(c => ({
    id: c.sha,
    message: c.commit.message.split('\n')[0],
    author: c.commit.author.name,
    email: c.commit.author.email,
    initials: c.commit.author.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    color: '#f0883e',
    time: formatRelativeTime(c.commit.author.date),
    branch: branch,
    tags: [],
    url: c.html_url,
  }))
}

function formatRelativeTime(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'justo ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months > 1 ? 'es' : ''}`
}

export async function createRepo(token, details) {
  const payload = {
    name: details.name,
    description: details.description || '',
    private: details.private,
    auto_init: details.autoInit !== false,
  }
  const res = await fetch(`${BASE}/user/repos`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error creando repo (${res.status})`)
  }
  return res.json()
}

export async function getPullRequests(token, owner, repo, state = 'open') {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(state)}&per_page=100`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando PRs (${res.status})`)
  const data = await res.json()
  return data.map(pr => ({
    id: String(pr.number),
    number: pr.number,
    title: pr.title,
    description: pr.body || '',
    state: pr.state,
    user: pr.user.login,
    avatar: pr.user.avatar_url,
    source: pr.head.ref,
    target: pr.base.ref,
    headSha: pr.head.sha,
    createdAt: pr.created_at,
    url: pr.html_url,
    provider: 'github'
  }))
}

export async function createPullRequest(token, owner, repo, details) {
  const payload = {
    title: details.title,
    body: details.description || '',
    head: details.sourceBranch,
    base: details.targetBranch
  }
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error creando PR (${res.status})`)
  }
  return res.json()
}

export async function mergePullRequest(token, owner, repo, prNumber) {
  const payload = {
    commit_title: `Merge Pull Request #${prNumber}`
  }
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error fusionando PR (${res.status})`)
  }
  return res.json()
}

export async function getPRComments(token, owner, repo, prNumber) {
  const [issueRes, reviewRes] = await Promise.all([
    fetch(`${BASE}/repos/${owner}/${repo}/issues/${prNumber}/comments`, { headers: headers(token) }),
    fetch(`${BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`, { headers: headers(token) })
  ])

  const issueComments = issueRes.ok ? await issueRes.json() : []
  const reviewComments = reviewRes.ok ? await reviewRes.json() : []

  const allComments = [
    ...issueComments.map(c => ({
      id: String(c.id),
      user: c.user.login,
      avatar: c.user.avatar_url,
      body: c.body,
      createdAt: c.created_at,
      path: null,
      line: null,
      side: null
    })),
    ...reviewComments.map(c => ({
      id: String(c.id),
      user: c.user.login,
      avatar: c.user.avatar_url,
      body: c.body,
      createdAt: c.created_at,
      path: c.path,
      line: c.line || c.original_line,
      side: c.side || 'RIGHT'
    }))
  ]

  // Sort chronologically
  return allComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function createPRComment(token, owner, repo, prNumber, body, inlineDetails = null) {
  const isInline = !!inlineDetails
  const url = isInline
    ? `${BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`
    : `${BASE}/repos/${owner}/${repo}/issues/${prNumber}/comments`

  const payload = isInline
    ? {
        body,
        commit_id: inlineDetails.commitId,
        path: inlineDetails.path,
        line: inlineDetails.line,
        side: inlineDetails.side || 'RIGHT'
      }
    : { body }

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error creando comentario (${res.status})`)
  }
  return res.json()
}

export async function getPRCheckRuns(token, owner, repo, ref) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/commits/${ref}/check-runs`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando checks (${res.status})`)
  const data = await res.json()
  return (data.check_runs || []).map(cr => ({
    id: String(cr.id),
    name: cr.name,
    status: cr.status,
    conclusion: cr.conclusion,
    detailsUrl: cr.html_url
  }))
}

export async function getPRFiles(token, owner, repo, prNumber) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando archivos del PR (${res.status})`)
  const data = await res.json()
  return data.map(f => ({
    sha: f.sha,
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch || ''
  }))
}
