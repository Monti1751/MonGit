// Provider registry — metadata + dynamic API dispatch

import * as github from './github.js'
import * as gitlab from './gitlab.js'
import * as bitbucket from './bitbucket.js'
import * as codeberg from './codeberg.js'
import { createGiteaClient } from './gitea.js'

export const PROVIDER_META = {
  github: {
    id: 'github',
    name: 'GitHub',
    color: '#f0883e',
    bgColor: '#0d1117',
    borderColor: '#30363d',
    icon: '🐙',
    authType: 'token',          // single token
    tokenLabel: 'Personal Access Token (PAT)',
    tokenHelp: 'https://github.com/settings/tokens/new?scopes=repo,read:user',
    tokenHelpText: 'Crear token en GitHub →',
    tokenPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    fields: [{ key: 'token', label: 'Token de acceso', type: 'password', placeholder: 'ghp_...' }],
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    color: '#fc6d26',
    bgColor: '#1a1a2e',
    borderColor: '#fc6d2640',
    icon: '🦊',
    authType: 'token',
    tokenLabel: 'Personal Access Token (PAT)',
    tokenHelp: 'https://gitlab.com/-/user_settings/personal_access_tokens',
    tokenHelpText: 'Crear token en GitLab →',
    tokenPlaceholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
    fields: [{ key: 'token', label: 'Token de acceso', type: 'password', placeholder: 'glpat-...' }],
  },
  bitbucket: {
    id: 'bitbucket',
    name: 'Bitbucket',
    color: '#0052cc',
    bgColor: '#0a1628',
    borderColor: '#0052cc40',
    icon: '🪣',
    authType: 'basic',          // username + app-password
    tokenHelp: 'https://bitbucket.org/account/settings/app-passwords/new',
    tokenHelpText: 'Crear App Password →',
    fields: [
      { key: 'username', label: 'Usuario de Bitbucket', type: 'text', placeholder: 'tu-usuario' },
      { key: 'appPassword', label: 'App Password', type: 'password', placeholder: 'ATBB...' },
    ],
  },
  codeberg: {
    id: 'codeberg',
    name: 'Codeberg',
    color: '#57a148',
    bgColor: '#0d1a0e',
    borderColor: '#57a14840',
    icon: '🌲',
    authType: 'token',
    tokenLabel: 'Access Token',
    tokenHelp: 'https://codeberg.org/user/settings/applications',
    tokenHelpText: 'Crear token en Codeberg →',
    tokenPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    fields: [{ key: 'token', label: 'Token de acceso', type: 'password', placeholder: 'Token...' }],
  },
  gitea: {
    id: 'gitea',
    name: 'Gitea',
    color: '#609926',
    bgColor: '#0e1a0a',
    borderColor: '#60992640',
    icon: '🍵',
    authType: 'gitea',          // custom URL + token
    tokenLabel: 'Access Token',
    tokenHelp: null,
    tokenHelpText: null,
    fields: [
      { key: 'url', label: 'URL de tu instancia', type: 'url', placeholder: 'https://git.miservidor.com' },
      { key: 'token', label: 'Token de acceso', type: 'password', placeholder: 'Token...' },
    ],
  },
}

/**
 * Validate credentials and return the user profile.
 * Throws on failure.
 */
export async function testConnection(providerId, creds) {
  switch (providerId) {
    case 'github':   return github.getUser(creds.token)
    case 'gitlab':   return gitlab.getUser(creds.token)
    case 'bitbucket':return bitbucket.getUser(creds.username, creds.appPassword)
    case 'codeberg': return codeberg.getUser(creds.token)
    case 'gitea':    return createGiteaClient(creds.url).getUser(creds.token)
    default: throw new Error(`Proveedor desconocido: ${providerId}`)
  }
}

export async function fetchRepos(providerId, creds) {
  switch (providerId) {
    case 'github':   return github.getRepos(creds.token)
    case 'gitlab':   return gitlab.getRepos(creds.token)
    case 'bitbucket':return bitbucket.getRepos(creds.username, creds.appPassword)
    case 'codeberg': return codeberg.getRepos(creds.token)
    case 'gitea':    return createGiteaClient(creds.url).getRepos(creds.token)
    default: throw new Error(`Proveedor desconocido: ${providerId}`)
  }
}

export async function fetchBranches(providerId, creds, owner, repo, meta = {}) {
  switch (providerId) {
    case 'github':   return github.getBranches(creds.token, owner, repo)
    case 'gitlab':   return gitlab.getBranches(creds.token, owner, repo, meta.projectId)
    case 'bitbucket':return bitbucket.getBranches(creds.username, creds.appPassword, meta.workspace || owner, repo)
    case 'codeberg': return codeberg.getBranches(creds.token, owner, repo)
    case 'gitea':    return createGiteaClient(creds.url).getBranches(creds.token, owner, repo)
    default: throw new Error(`Proveedor desconocido: ${providerId}`)
  }
}

export async function fetchCommits(providerId, creds, owner, repo, branch, meta = {}) {
  switch (providerId) {
    case 'github':   return github.getCommits(creds.token, owner, repo, branch)
    case 'gitlab':   return gitlab.getCommits(creds.token, owner, repo, branch, 20, meta.projectId)
    case 'bitbucket':return bitbucket.getCommits(creds.username, creds.appPassword, meta.workspace || owner, repo, branch)
    case 'codeberg': return codeberg.getCommits(creds.token, owner, repo, branch)
    case 'gitea':    return createGiteaClient(creds.url).getCommits(creds.token, owner, repo, branch)
    default: throw new Error(`Proveedor desconocido: ${providerId}`)
  }
}

export async function createProviderRepo(providerId, creds, details, meta = {}) {
  switch (providerId) {
    case 'github':   return github.createRepo(creds.token, details)
    case 'gitlab':   return gitlab.createRepo(creds.token, details)
    case 'bitbucket':return bitbucket.createRepo(creds.username, creds.appPassword, meta.workspace || details.owner, details)
    case 'codeberg': return codeberg.createRepo(creds.token, details)
    case 'gitea':    return createGiteaClient(creds.url).createRepo(creds.token, details)
    default: throw new Error(`Proveedor desconocido: ${providerId}`)
  }
}

export async function fetchPullRequests(providerId, creds, owner, repo, state, meta = {}) {
  switch (providerId) {
    case 'github': return github.getPullRequests(creds.token, owner, repo, state)
    case 'gitlab': return gitlab.getPullRequests(creds.token, owner, repo, state, meta.projectId)
    default: return []
  }
}

export async function createPullRequest(providerId, creds, owner, repo, details, meta = {}) {
  switch (providerId) {
    case 'github': return github.createPullRequest(creds.token, owner, repo, details)
    case 'gitlab': return gitlab.createPullRequest(creds.token, owner, repo, details, meta.projectId)
    default: throw new Error(`Operación no soportada por el proveedor: ${providerId}`)
  }
}

export async function mergePullRequest(providerId, creds, owner, repo, prNumber, meta = {}) {
  switch (providerId) {
    case 'github': return github.mergePullRequest(creds.token, owner, repo, prNumber)
    case 'gitlab': return gitlab.mergePullRequest(creds.token, owner, repo, prNumber, meta.projectId)
    default: throw new Error(`Operación no soportada por el proveedor: ${providerId}`)
  }
}

export async function fetchPRComments(providerId, creds, owner, repo, prNumber, meta = {}) {
  switch (providerId) {
    case 'github': return github.getPRComments(creds.token, owner, repo, prNumber)
    case 'gitlab': return gitlab.getPRComments(creds.token, owner, repo, prNumber, meta.projectId)
    default: return []
  }
}

export async function createPRComment(providerId, creds, owner, repo, prNumber, body, inlineDetails, meta = {}) {
  switch (providerId) {
    case 'github': return github.createPRComment(creds.token, owner, repo, prNumber, body, inlineDetails)
    case 'gitlab': return gitlab.createPRComment(creds.token, owner, repo, prNumber, body, inlineDetails, meta.projectId)
    default: throw new Error(`Operación no soportada por el proveedor: ${providerId}`)
  }
}

export async function fetchPRCheckRuns(providerId, creds, owner, repo, ref, meta = {}) {
  switch (providerId) {
    case 'github': return github.getPRCheckRuns(creds.token, owner, repo, ref)
    case 'gitlab': return gitlab.getPRCheckRuns(creds.token, owner, repo, ref, meta.projectId)
    default: return []
  }
}

export async function fetchPRFiles(providerId, creds, owner, repo, prNumber, meta = {}) {
  switch (providerId) {
    case 'github': return github.getPRFiles(creds.token, owner, repo, prNumber)
    case 'gitlab': return gitlab.getPRFiles(creds.token, owner, repo, prNumber, meta.projectId)
    default: return []
  }
}
