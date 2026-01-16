export type CloudFile = {
  path: string
  content: string
  updatedAt: number
}

type UserStore = Map<string, CloudFile>

const store = new Map<string, UserStore>()

const ensureUserStore = (userId: string): UserStore => {
  if (!store.has(userId)) {
    store.set(userId, new Map())
  }
  return store.get(userId) as UserStore
}

export const pushFiles = (userId: string, files: CloudFile[]): CloudFile[] => {
  const userStore = ensureUserStore(userId)
  const saved: CloudFile[] = []
  for (const file of files) {
    if (!file.path || typeof file.content !== 'string') continue
    const record: CloudFile = {
      path: file.path,
      content: file.content,
      updatedAt: file.updatedAt || Date.now(),
    }
    userStore.set(record.path, record)
    saved.push(record)
  }
  return saved
}

export const pullFiles = (userId: string): CloudFile[] => {
  const userStore = ensureUserStore(userId)
  return Array.from(userStore.values()).sort((a, b) => a.path.localeCompare(b.path))
}
