export type ExportArtifact = {
  id: string
  filePath: string
  fileName: string
  mimeType: string
  createdAt: number
}

const store = new Map<string, ExportArtifact>()

const makeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const saveExportArtifact = (filePath: string, fileName: string, mimeType: string): ExportArtifact => {
  const artifact: ExportArtifact = {
    id: makeId(),
    filePath,
    fileName,
    mimeType,
    createdAt: Date.now(),
  }
  store.set(artifact.id, artifact)
  return artifact
}

export const getExportArtifact = (id: string): ExportArtifact | null => store.get(id) ?? null

export const deleteExportArtifact = (id: string): ExportArtifact | null => {
  const artifact = store.get(id)
  if (!artifact) return null
  store.delete(id)
  return artifact
}
