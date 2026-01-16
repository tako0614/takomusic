import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { saveExportArtifact } from './exportStore.js'

export type AudioExportRequest = {
  score: unknown
  profile?: Record<string, unknown>
  format?: 'mp3' | 'wav'
}

export type AudioExportResult = {
  artifactId: string
  fileName: string
  mimeType: string
}

const isNode = (): boolean => typeof process !== 'undefined' && !!process.versions?.node

const exportsRoot = path.join(os.tmpdir(), 'takomusic-exports')

const runCommand = async (command: string, args: string[], cwd: string) =>
  new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, args, { cwd })
    let stdout = ''
    let stderr = ''
    let settled = false
    const settle = (code: number, out: string, err: string) => {
      if (settled) return
      settled = true
      resolve({ code, stdout: out, stderr: err })
    }
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (err) => {
      const combined = `${stderr}${stderr ? '\n' : ''}${err.message}`
      settle(1, stdout, combined)
    })
    child.on('close', (code) => {
      settle(code ?? 0, stdout, stderr)
    })
  })

const moveFile = async (source: string, target: string) => {
  try {
    await fs.rename(source, target)
  } catch {
    await fs.copyFile(source, target)
    await fs.unlink(source).catch(() => undefined)
  }
}

const resolveDefaultProfile = async (): Promise<Record<string, unknown>> => {
  const profilePath = path.resolve(process.cwd(), 'profiles', 'audio.mf.profile.json')
  const raw = await fs.readFile(profilePath, 'utf-8')
  return JSON.parse(raw) as Record<string, unknown>
}

const resolveRendererPath = (): string =>
  path.resolve(process.cwd(), 'tools', 'tako-render-audio', 'index.js')

const ensureOutputProfile = async (
  profile: Record<string, unknown>,
  outputPath: string,
  wavPath: string
) => {
  const output = (profile.output as Record<string, unknown>) ?? {}
  return {
    ...profile,
    output: {
      ...output,
      path: outputPath,
      wavPath,
    },
  }
}

export const exportAudio = async (request: AudioExportRequest): Promise<AudioExportResult> => {
  if (!isNode()) {
    throw new Error('Audio export requires a Node.js runtime')
  }

  if (!request.score) {
    throw new Error('Score payload is required')
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'takomusic-audio-'))
  try {
    const scorePath = path.join(tempDir, 'score.json')
    const profilePath = path.join(tempDir, 'profile.json')
    const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const baseName = `takomusic_export_${stamp}`
    const format = request.format === 'wav' ? 'wav' : 'mp3'
    const outputPath = path.join(tempDir, `${baseName}.${format}`)
    const wavPath = path.join(tempDir, `${baseName}.wav`)

    const profileData = request.profile ?? (await resolveDefaultProfile())
    const patchedProfile = await ensureOutputProfile(profileData, outputPath, wavPath)

    await fs.writeFile(scorePath, JSON.stringify(request.score, null, 2))
    await fs.writeFile(profilePath, JSON.stringify(patchedProfile, null, 2))

    const rendererPath = resolveRendererPath()
    const result = await runCommand(
      'node',
      [rendererPath, 'render', '--score', scorePath, '--profile', profilePath],
      tempDir
    )

    if (result.code !== 0) {
      const message = result.stderr.trim() || result.stdout.trim() || 'Renderer failed'
      throw new Error(message)
    }

    await fs.mkdir(exportsRoot, { recursive: true })
    const finalPath = path.join(exportsRoot, `${baseName}.${format}`)
    await moveFile(outputPath, finalPath)

    const fileName = path.basename(finalPath)
    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
    const artifact = saveExportArtifact(finalPath, fileName, mimeType)

    return {
      artifactId: artifact.id,
      fileName: artifact.fileName,
      mimeType: artifact.mimeType,
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}
