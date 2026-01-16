export const DB_NAME = 'takomusic'
export const DB_VERSION = 2
export const STORE_PROJECTS = 'projects'
export const STORE_SETTINGS = 'settings'

type SettingRecord = { key: string; value: string }

const closeDb = (db: IDBDatabase) => {
  try {
    db.close()
  } catch {
    // Ignore close errors; caller already has a response.
  }
}

export type DbOpenResult = { db: IDBDatabase | null; error: string | null }

export const openDb = (): Promise<DbOpenResult> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve({ db: null, error: 'IndexedDB is not supported in this browser.' })
      return
    }
    let settled = false
    const finish = (db: IDBDatabase | null, error: string | null) => {
      if (settled) return
      settled = true
      resolve({ db, error })
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        const tx = request.transaction
        let projectsStore: IDBObjectStore | null = null
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          projectsStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'key' })
        } else if (tx) {
          projectsStore = tx.objectStore(STORE_PROJECTS)
        }
        if (projectsStore && !projectsStore.indexNames.contains('user')) {
          projectsStore.createIndex('user', 'user', { unique: false })
        }
        if (projectsStore && !projectsStore.indexNames.contains('updatedAt')) {
          projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => closeDb(db)
        finish(db, null)
      }
      request.onerror = () => finish(null, 'Failed to open IndexedDB.')
      request.onblocked = () => finish(null, 'IndexedDB is blocked by another tab.')
    } catch {
      finish(null, 'Failed to open IndexedDB.')
    }
  })

export const readSetting = async (key: string): Promise<string | null> => {
  const { db } = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const tx = db.transaction(STORE_SETTINGS, 'readonly')
    tx.oncomplete = () => closeDb(db)
    tx.onerror = () => closeDb(db)
    tx.onabort = () => closeDb(db)
    const store = tx.objectStore(STORE_SETTINGS)
    const request = store.get(key)
    request.onsuccess = () => {
      const record = request.result as SettingRecord | undefined
      finish(record?.value ?? null)
    }
    request.onerror = () => finish(null)
  })
}

export const writeSetting = async (key: string, value: string | null): Promise<boolean> => {
  const { db } = await openDb()
  if (!db) return false
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok)
    }
    const tx = db.transaction(STORE_SETTINGS, 'readwrite')
    tx.oncomplete = () => {
      closeDb(db)
      finish(true)
    }
    tx.onerror = () => {
      closeDb(db)
      finish(false)
    }
    tx.onabort = () => {
      closeDb(db)
      finish(false)
    }
    const store = tx.objectStore(STORE_SETTINGS)
    if (value === null) {
      store.delete(key)
    } else {
      store.put({ key, value })
    }
  })
}
