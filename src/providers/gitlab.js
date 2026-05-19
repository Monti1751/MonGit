// GitLab API client
// Docs: https://docs.gitlab.com/ee/api/rest/

const BASE = 'https://gitlab.com/api/v4'

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
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
      `${BASE}/projects?membership=true&per_page=100&page=${page}&order_by=last_activity_at&simple=true`,
      { headers: headers(token) }
    )
    if (!res.ok) throw new Error(`Error cargando proyectos (${res.status})`)
    const batch = await res.json()
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.map(p => ({
    id: String(p.id),
    name: p.name,
    fullName: p.path_with_namespace,
    owner: p.namespace?.path || '',
    private: p.visibility !== 'public',
    description: p.description,
    defaultBranch: p.default_branch || 'main',
    updatedAt: p.last_activity_at,
    url: p.web_url,
    provider: 'gitlab',
    // GitLab uses numeric project ID for API calls
    projectId: p.id,
  }))
}

export async function getBranches(token, _owner, _repo, projectId) {
  const all = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${BASE}/projects/${projectId}/repository/branches?per_page=100&page=${page}`,
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
    sha: b.commit?.id || '',
    protected: b.protected,
  }))
}

export async function getCommits(token, _owner, _repo, branch, perPage = 20, projectId) {
  const res = await fetch(
    `${BASE}/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=${perPage}`,
    { headers: headers(token) }
  )
  if (!res.ok) throw new Error(`Error cargando commits (${res.status})`)
  const data = await res.json()
  return data.map(c => ({
    id: c.id,
    message: c.title || c.message?.split('\n')[0] || '',
    author: c.author_name,
    email: c.author_email,
    initials: c.author_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    color: '#fc6d26',
    time: formatRelativeTime(c.authored_date),
    branch,
    tags: [],
    url: c.web_url,
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
    visibility: details.private ? 'private' : 'public',
    initialize_with_readme: true,
  }
  const res = await fetch(`${BASE}/projects`, {
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
