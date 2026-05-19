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

export async function getCommits(token, owner, repo, branch, perPage = 20) {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}`,
    { headers: headers(token) }
  )
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
    auto_init: true,
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
