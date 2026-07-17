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

export async function getCommits(token, owner, repo, branch, perPage = 20, projectId) {
  const res = await fetch(
    `${BASE}/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=${perPage}`,
    { headers: headers(token) }
  )
  if (res.status === 409 || res.status === 404) return [] // Empty repository or branch not found
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
    initialize_with_readme: details.autoInit !== false,
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

export async function getPullRequests(token, _owner, _repo, state = 'open', projectId) {
  // Map open -> opened, all -> all, closed -> closed
  const glState = state === 'open' ? 'opened' : state
  const stateQuery = glState !== 'all' ? `&state=${encodeURIComponent(glState)}` : ''
  const res = await fetch(`${BASE}/projects/${projectId}/merge_requests?per_page=100${stateQuery}`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando MRs (${res.status})`)
  const data = await res.json()
  return data.map(mr => ({
    id: String(mr.iid),
    number: mr.iid,
    title: mr.title,
    description: mr.description || '',
    state: mr.state === 'opened' ? 'open' : 'closed',
    user: mr.author.username,
    avatar: mr.author.avatar_url,
    source: mr.source_branch,
    target: mr.target_branch,
    headSha: mr.sha,
    createdAt: mr.created_at,
    url: mr.web_url,
    provider: 'gitlab',
    projectId: projectId
  }))
}

export async function createPullRequest(token, _owner, _repo, details, projectId) {
  const payload = {
    title: details.title,
    description: details.description || '',
    source_branch: details.sourceBranch,
    target_branch: details.targetBranch
  }
  const res = await fetch(`${BASE}/projects/${projectId}/merge_requests`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error creando MR (${res.status})`)
  }
  return res.json()
}

export async function mergePullRequest(token, _owner, _repo, mrIid, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/merge_requests/${mrIid}/merge`, {
    method: 'PUT',
    headers: headers(token)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error fusionando MR (${res.status})`)
  }
  return res.json()
}

export async function getPRComments(token, _owner, _repo, mrIid, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando notas (${res.status})`)
  const data = await res.json()
  // Filter out system notes/bot messages if needed, or keep all
  return data
    .filter(note => !note.system)
    .map(note => ({
      id: String(note.id),
      user: note.author.username,
      avatar: note.author.avatar_url,
      body: note.body,
      createdAt: note.created_at,
      path: note.position?.new_path || null,
      line: note.position?.new_line || null,
      side: 'RIGHT'
    }))
}

export async function createPRComment(token, _owner, _repo, mrIid, body, inlineDetails = null, projectId) {
  const isInline = !!inlineDetails
  const payload = isInline
    ? {
        body,
        position: {
          position_type: 'text',
          new_path: inlineDetails.path,
          new_line: inlineDetails.line,
          base_sha: inlineDetails.baseSha,
          start_sha: inlineDetails.startSha,
          head_sha: inlineDetails.commitId
        }
      }
    : { body }

  const res = await fetch(`${BASE}/projects/${projectId}/merge_requests/${mrIid}/notes`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error creando nota (${res.status})`)
  }
  return res.json()
}

export async function getPRCheckRuns(token, _owner, _repo, ref, projectId) {
  // Query pipelines for the given ref commit sha
  const res = await fetch(`${BASE}/projects/${projectId}/pipelines?sha=${encodeURIComponent(ref)}`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando pipelines (${res.status})`)
  const data = await res.json()
  return data.map(p => ({
    id: String(p.id),
    name: `Pipeline #${p.id}`,
    status: p.status === 'running' || p.status === 'pending' ? 'in_progress' : 'completed',
    conclusion: p.status === 'success' ? 'success' : p.status === 'failed' ? 'failure' : 'neutral',
    detailsUrl: p.web_url
  }))
}

export async function getPRFiles(token, _owner, _repo, mrIid, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/merge_requests/${mrIid}/changes`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando cambios de MR (${res.status})`)
  const data = await res.json()
  return (data.changes || []).map(c => ({
    sha: c.amended_commit_sha || '',
    filename: c.new_path,
    status: c.new_file ? 'added' : c.deleted_file ? 'removed' : 'modified',
    additions: 0, // GitLab doesn't return count directly in simple change payload
    deletions: 0,
    changes: 0,
    patch: c.diff || ''
  }))
}

// ── Issues ──────────────────────────────────────────────────────────────────

export async function getIssues(token, _owner, _repo, state = 'opened', labels = '', projectId) {
  const glState = state === 'open' ? 'opened' : state === 'closed' ? 'closed' : state
  const params = new URLSearchParams({ state: glState, per_page: '100' })
  if (labels) params.set('labels', labels)
  const res = await fetch(`${BASE}/projects/${projectId}/issues?${params}`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando issues (${res.status})`)
  const data = await res.json()
  return data.map(i => ({
    id: String(i.id),
    number: i.iid,
    title: i.title,
    body: i.description || '',
    state: i.state === 'opened' ? 'open' : 'closed',
    author: i.author?.username || '',
    authorAvatar: i.author?.avatar_url || '',
    assignee: i.assignee?.username || null,
    assigneeAvatar: i.assignee?.avatar_url || null,
    labels: i.labels.map(name => ({ id: name, name, color: '#6b7280' })),
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    htmlUrl: i.web_url,
    commentsCount: i.user_notes_count || 0,
  }))
}

export async function createIssue(token, _owner, _repo, { title, body, labels, assignee }, projectId) {
  const payload = { title, description: body }
  if (labels && labels.length) payload.labels = labels.join(',')
  if (assignee) payload.assignee_ids = [assignee]
  const res = await fetch(`${BASE}/projects/${projectId}/issues`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Error creando issue (${res.status})`)
  }
  return res.json()
}

export async function updateIssueState(token, _owner, _repo, issueIid, state, projectId) {
  const glState = state === 'closed' ? 'close' : 'reopen'
  const res = await fetch(`${BASE}/projects/${projectId}/issues/${issueIid}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ state_event: glState })
  })
  if (!res.ok) throw new Error(`Error actualizando issue (${res.status})`)
  return res.json()
}

export async function updateIssueAssignee(token, _owner, _repo, issueIid, assigneeIds, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/issues/${issueIid}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ assignee_ids: assigneeIds })
  })
  if (!res.ok) throw new Error(`Error asignando issue (${res.status})`)
  return res.json()
}

export async function getIssueComments(token, _owner, _repo, issueIid, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/issues/${issueIid}/notes?per_page=100&sort=asc`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando comentarios (${res.status})`)
  const data = await res.json()
  return data.filter(n => !n.system).map(c => ({
    id: String(c.id),
    author: c.author?.username || '',
    authorAvatar: c.author?.avatar_url || '',
    body: c.body,
    createdAt: c.created_at,
  }))
}

export async function createIssueComment(token, _owner, _repo, issueIid, body, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/issues/${issueIid}/notes`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ body })
  })
  if (!res.ok) throw new Error(`Error creando comentario (${res.status})`)
  return res.json()
}

export async function getRepoLabels(token, _owner, _repo, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/labels?per_page=100`, {
    headers: headers(token)
  })
  if (!res.ok) throw new Error(`Error cargando etiquetas (${res.status})`)
  const data = await res.json()
  return data.map(l => ({ id: String(l.id), name: l.name, color: l.color || '#6b7280' }))
}

export async function getRepoCollaborators(token, _owner, _repo, projectId) {
  const res = await fetch(`${BASE}/projects/${projectId}/members/all?per_page=100`, {
    headers: headers(token)
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.map(u => ({ id: String(u.id), login: u.username, avatar: u.avatar_url }))
}
