// Bitbucket API client
// Auth: Basic (username + App Password)
// Docs: https://developer.atlassian.com/cloud/bitbucket/rest/

const BASE = 'https://api.bitbucket.org/2.0'

function headers(username, appPassword) {
  const b64 = btoa(`${username}:${appPassword}`)
  return {
    Authorization: `Basic ${b64}`,
    'Content-Type': 'application/json',
  }
}

export async function getUser(username, appPassword) {
  const res = await fetch(`${BASE}/user`, { headers: headers(username, appPassword) })
  if (!res.ok) throw new Error(`Credenciales inválidas (${res.status})`)
  return res.json()
}

export async function getRepos(username, appPassword) {
  const all = []
  let url = `${BASE}/repositories/${username}?pagelen=100&sort=-updated_on&role=member`
  while (url) {
    const res = await fetch(url, { headers: headers(username, appPassword) })
    if (!res.ok) throw new Error(`Error cargando repos (${res.status})`)
    const data = await res.json()
    all.push(...(data.values || []))
    url = data.next || null
  }
  return all.map(r => ({
    id: r.uuid,
    name: r.slug,
    fullName: r.full_name,
    owner: r.owner?.nickname || username,
    private: r.is_private,
    description: r.description,
    defaultBranch: r.mainbranch?.name || 'main',
    updatedAt: r.updated_on,
    url: r.links?.html?.href || '',
    provider: 'bitbucket',
    workspace: r.owner?.nickname || username,
  }))
}

export async function getBranches(username, appPassword, workspace, repoSlug) {
  const all = []
  let url = `${BASE}/repositories/${workspace}/${repoSlug}/refs/branches?pagelen=100`
  while (url) {
    const res = await fetch(url, { headers: headers(username, appPassword) })
    if (!res.ok) throw new Error(`Error cargando ramas (${res.status})`)
    const data = await res.json()
    all.push(...(data.values || []))
    url = data.next || null
  }
  return all.map(b => ({
    name: b.name,
    sha: b.target?.hash || '',
    protected: false,
  }))
}

export async function getCommits(username, appPassword, workspace, repo, branch = 'main', perPage = 20) {
  const res = await fetch(
    `${BASE}/repositories/${workspace}/${repo}/commits/${encodeURIComponent(branch)}?pagelen=${perPage}`,
    { headers: headers(username, appPassword) }
  )
  if (res.status === 409 || res.status === 404) return [] // Empty repository or branch not found
  if (!res.ok) throw new Error(`Error cargando commits (${res.status})`)
  const data = await res.json()
  return (data.values || []).map(c => ({
    id: c.hash,
    message: c.message?.split('\n')[0] || '',
    author: c.author?.user?.display_name || c.author?.raw?.split('<')[0].trim() || 'Unknown',
    email: '',
    initials: (c.author?.user?.display_name || 'XX').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    color: '#0052cc',
    time: formatRelativeTime(c.date),
    branch,
    tags: [],
    url: c.links?.html?.href || '',
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

export async function createRepo(username, appPassword, workspace, details) {
  const repoSlug = details.name.replace(/[^a-zA-Z0-9_-]+/g, '-')
  const payload = {
    scm: 'git',
    is_private: details.private,
    description: details.description || '',
    project: { key: workspace.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'PROJ' }
  }
  
  const res = await fetch(`${BASE}/repositories/${workspace}/${repoSlug}`, {
    method: 'POST',
    headers: headers(username, appPassword),
    body: JSON.stringify(payload)
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error creando repo (${res.status})`)
  }
  
  // Create an initial commit (README.md) since auto_init doesn't exist in API payload
  if (details.autoInit !== false) {
    try {
      const formData = new URLSearchParams()
      formData.append('message', 'Initial commit')
      formData.append('README.md', '# ' + details.name)
      await fetch(`${BASE}/repositories/${workspace}/${repoSlug}/src`, {
        method: 'POST',
        headers: {
          Authorization: headers(username, appPassword).Authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })
    } catch (e) {
      // Ignore
    }
  }

  return res.json()
}
