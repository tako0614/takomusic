import fs from 'node:fs/promises'
import { exportAudio } from '../services/audioExport.js'
import { deleteExportArtifact, getExportArtifact } from '../services/exportStore.js'

export type ExportRequestBody = {
  score?: unknown
  profile?: Record<string, unknown>
  format?: 'mp3' | 'wav'
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const readJson = async (request: Request): Promise<ExportRequestBody> => {
  try {
    return (await request.json()) as ExportRequestBody
  } catch {
    return {}
  }
}

export const handleExportRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)

  if (request.method === 'POST' && url.pathname === '/api/exports/audio') {
    const body = await readJson(request)
    if (!body.score) {
      return jsonResponse({ ok: false, error: 'Score payload required' }, 400)
    }
    try {
      const result = await exportAudio({
        score: body.score,
        profile: body.profile,
        format: body.format,
      })
      return jsonResponse({ ok: true, ...result })
    } catch (err) {
      return jsonResponse({ ok: false, error: err instanceof Error ? err.message : 'Export failed' }, 500)
    }
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/exports/')) {
    const id = url.pathname.replace('/api/exports/', '')
    const artifact = getExportArtifact(id)
    if (!artifact) {
      return jsonResponse({ ok: false, error: 'Export not found' }, 404)
    }
    try {
      const data = await fs.readFile(artifact.filePath)
      deleteExportArtifact(id)
      await fs.unlink(artifact.filePath).catch(() => undefined)
      return new Response(data, {
        status: 200,
        headers: {
          'content-type': artifact.mimeType,
          'content-disposition': `attachment; filename="${artifact.fileName}"`,
        },
      })
    } catch {
      deleteExportArtifact(id)
      return jsonResponse({ ok: false, error: 'Export not found' }, 404)
    }
  }

  return jsonResponse({ ok: false, error: 'Not found' }, 404)
}
