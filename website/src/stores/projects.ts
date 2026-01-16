import { createEffect, createSignal } from 'solid-js'
import { user } from './session'
import { openDb, STORE_PROJECTS } from './db'

export type Project = {
  id: string
  name: string
  code: string
  updatedAt: number
}

type ProjectRecord = Project & { key: string; user: string }

const closeDb = (db: IDBDatabase) => {
  try {
    db.close()
  } catch {
    // Ignore close errors.
  }
}

const [projects, setProjects] = createSignal<Project[]>([])
const [projectsError, setProjectsError] = createSignal<string | null>(null)
let fetchToken = 0

const toRecord = (username: string, project: Project): ProjectRecord => ({
  ...project,
  user: username,
  key: `${username}:${project.id}`,
})

const fetchProjects = async (username: string): Promise<Project[]> => {
  const { db, error } = await openDb()
  if (!db) {
    setProjectsError(error ?? 'IndexedDB is unavailable.')
    return []
  }
  setProjectsError(null)

  return new Promise((resolve) => {
    let settled = false
    const finish = (items: Project[]) => {
      if (settled) return
      settled = true
      resolve(items)
    }
    const tx = db.transaction(STORE_PROJECTS, 'readonly')
    tx.oncomplete = () => closeDb(db)
    tx.onerror = () => closeDb(db)
    tx.onabort = () => closeDb(db)
    const store = tx.objectStore(STORE_PROJECTS)
    const hasUserIndex = store.indexNames.contains('user')
    const request = hasUserIndex
      ? store.index('user').getAll(IDBKeyRange.only(username))
      : store.getAll()
    request.onsuccess = () => {
      const records = request.result as ProjectRecord[]
      const scoped = hasUserIndex ? records : records.filter((item) => item.user === username)
      const items = scoped.map(({ id, name, code, updatedAt }) => ({
        id,
        name,
        code,
        updatedAt,
      }))
      items.sort((a, b) => b.updatedAt - a.updatedAt)
      finish(items)
    }
    request.onerror = () => {
      setProjectsError('Failed to load projects.')
      finish([])
    }
  })
}

const upsertProjectRecord = async (username: string, project: Project): Promise<boolean> => {
  const { db, error } = await openDb()
  if (!db) {
    setProjectsError(error ?? 'IndexedDB is unavailable.')
    return false
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok)
    }
    const tx = db.transaction(STORE_PROJECTS, 'readwrite')
    tx.oncomplete = () => {
      closeDb(db)
      setProjectsError(null)
      finish(true)
    }
    tx.onerror = () => {
      closeDb(db)
      setProjectsError('Failed to save project.')
      finish(false)
    }
    tx.onabort = () => {
      closeDb(db)
      setProjectsError('Failed to save project.')
      finish(false)
    }
    const store = tx.objectStore(STORE_PROJECTS)
    store.put(toRecord(username, project))
  })
}

const removeProjectRecord = async (username: string, id: string): Promise<boolean> => {
  const { db, error } = await openDb()
  if (!db) {
    setProjectsError(error ?? 'IndexedDB is unavailable.')
    return false
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok)
    }
    const tx = db.transaction(STORE_PROJECTS, 'readwrite')
    tx.oncomplete = () => {
      closeDb(db)
      setProjectsError(null)
      finish(true)
    }
    tx.onerror = () => {
      closeDb(db)
      setProjectsError('Failed to delete project.')
      finish(false)
    }
    tx.onabort = () => {
      closeDb(db)
      setProjectsError('Failed to delete project.')
      finish(false)
    }
    const store = tx.objectStore(STORE_PROJECTS)
    store.delete(`${username}:${id}`)
  })
}

const refreshProjects = async (username: string, expectedLoadToken?: number) => {
  const token = ++fetchToken
  const items = await fetchProjects(username)
  if (token !== fetchToken) return
  if (typeof expectedLoadToken === 'number' && expectedLoadToken !== loadToken) return
  if (user() !== username) return
  setProjects(items)
}

let loadToken = 0

createEffect(() => {
  const currentUser = user()
  if (!currentUser) {
    setProjects([])
    setProjectsError(null)
    return
  }
  const token = ++loadToken
  void refreshProjects(currentUser, token)
})

const generateId = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const saveProject = async (name: string, code: string, id?: string): Promise<Project | null> => {
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

  const stored = await upsertProjectRecord(currentUser, next)
  if (!stored) return null
  setProjects(updated)
  void refreshProjects(currentUser)
  return next
}

export const deleteProject = async (id: string): Promise<boolean> => {
  const currentUser = user()
  if (!currentUser) return false
  const updated = projects().filter((project) => project.id !== id)
  const removed = await removeProjectRecord(currentUser, id)
  if (!removed) return false
  setProjects(updated)
  void refreshProjects(currentUser)
  return true
}

export const getProject = (id: string): Project | null => {
  const found = projects().find((project) => project.id === id)
  return found ?? null
}

export { projects, projectsError }
