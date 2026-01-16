import { createEffect, createSignal } from 'solid-js'
import { user } from './session'

export type Project = {
  id: string
  name: string
  code: string
  updatedAt: number
}

const STORAGE_PREFIX = 'takomusic.projects'

const storageKeyFor = (username: string) => `${STORAGE_PREFIX}.${username}`

const safeParse = (raw: string | null): Project[] => {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((item) => item && typeof item.id === 'string')
  } catch {
    return []
  }
}

const loadProjectsFor = (username: string): Project[] => {
  if (typeof localStorage === 'undefined') return []
  return safeParse(localStorage.getItem(storageKeyFor(username)))
}

const persistProjects = (username: string, list: Project[]) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKeyFor(username), JSON.stringify(list))
}

const [projects, setProjects] = createSignal<Project[]>([])

createEffect(() => {
  const currentUser = user()
  if (!currentUser) {
    setProjects([])
    return
  }
  setProjects(loadProjectsFor(currentUser))
})

const generateId = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const saveProject = (name: string, code: string, id?: string): Project | null => {
  const currentUser = user()
  if (!currentUser) return null

  const trimmed = name.trim()
  const projectName = trimmed.length > 0 ? trimmed : 'Untitled'
  const existing = projects()
  const now = Date.now()

  let next: Project | null = null
  const updated = existing.map((project) => {
    if (id && project.id === id) {
      next = { ...project, name: projectName, code, updatedAt: now }
      return next
    }
    if (!id && project.name === projectName) {
      next = { ...project, code, updatedAt: now }
      return next
    }
    return project
  })

  if (!next) {
    next = { id: generateId(), name: projectName, code, updatedAt: now }
    updated.unshift(next)
  }

  setProjects(updated)
  persistProjects(currentUser, updated)
  return next
}

export const deleteProject = (id: string): boolean => {
  const currentUser = user()
  if (!currentUser) return false
  const updated = projects().filter((project) => project.id !== id)
  setProjects(updated)
  persistProjects(currentUser, updated)
  return true
}

export const getProject = (id: string): Project | null => {
  const found = projects().find((project) => project.id === id)
  return found ?? null
}

export { projects }
