// Codeberg — Gitea instance at https://codeberg.org
import { createGiteaClient } from './gitea.js'

const client = createGiteaClient('https://codeberg.org')

export const getUser = (token) => client.getUser(token)
export const getRepos = (token) => client.getRepos(token)
export const getBranches = (token, owner, repo) => client.getBranches(token, owner, repo)
export const getCommits = (token, owner, repo, branch, perPage) =>
  client.getCommits(token, owner, repo, branch, perPage)
export const createRepo = (token, details) => client.createRepo(token, details)
