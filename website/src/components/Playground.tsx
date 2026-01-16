import { createEffect, createSignal, onMount, onCleanup, Show } from 'solid-js'
import { useI18n } from '../i18n'
import { compile as takoCompile, type Diagnostic } from '../lib/compiler'
import { getAudioPlayer, type ScoreIR } from '../lib/audioPlayer'
import { downloadMidi } from '../lib/midiExport'
import {
  composeAi,
  explainAi,
  chatAi,
  inlineAi,
  agentAi,
  extractCodeBlock,
  type AiMessage,
  type AiFile,
} from '../lib/aiClient'
import { user, signIn, signOut } from '../stores/session'
import { projects, saveProject, deleteProject, getProject } from '../stores/projects'
import { credits, canAfford, applyCreditSpend, syncCredits, getCreditCost } from '../stores/credits'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// Monaco editor types
declare global {
  interface Window {
    monaco: typeof import('monaco-editor')
    require: {
      config: (options: { paths: Record<string, string> }) => void
      (modules: string[], callback: (...args: unknown[]) => void): void
    }
  }
}

const defaultCode = `import { repeat } from "std:core";
import { kick, snare, hhc } from "std:drums";

fn drumPart() -> Clip {
  return clip {
    hit(kick, q, vel: 0.9);
    hit(hhc, q, vel: 0.5);
    hit(snare, q, vel: 0.8);
    hit(hhc, q, vel: 0.5);
  };
}

fn melodyPart() -> Clip {
  return clip {
    note(C4, q, vel: 0.7);
    note(E4, q, vel: 0.7);
    note(G4, q, vel: 0.7);
    note(E4, q, vel: 0.7);
  };
}

export fn main() -> Score {
  return score {
    meta { title "Playground Demo"; }

    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "piano" kind instrument {
      label "Piano";
      range A0..C8;
    }

    sound "drums" kind drumKit {
      drumKeys { kick; snare; hhc; }
    }

    track "Piano" role Instrument sound "piano" {
      place 1:1 repeat(melodyPart(), 4);
    }

    track "Drums" role Drums sound "drums" {
      place 1:1 repeat(drumPart(), 4);
    }
  };
}`

const exampleSnippets = [
  {
    name: 'Simple Melody',
    code: `import { repeat } from "std:core";

fn melody() -> Clip {
  return clip {
    note(C4, q, vel: 0.7);
    note(D4, q, vel: 0.7);
    note(E4, q, vel: 0.7);
    note(F4, q, vel: 0.7);
    note(G4, h, vel: 0.8);
    rest(h);
  };
}

export fn main() -> Score {
  return score {
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 100bpm; }

    sound "piano" kind instrument { range A0..C8; }

    track "Piano" role Instrument sound "piano" {
      place 1:1 repeat(melody(), 2);
    }
  };
}`
  },
  {
    name: 'Chord Progression',
    code: `import { concat } from "std:core";
import { majorTriad, minorTriad } from "std:theory";

fn progression() -> Clip {
  return clip {
    chord(majorTriad(C4), w, vel: 0.6);
    chord(minorTriad(A3), w, vel: 0.6);
    chord(majorTriad(F3), w, vel: 0.6);
    chord(majorTriad(G3), w, vel: 0.6);
  };
}

export fn main() -> Score {
  return score {
    meta { title "Chord Progression"; }
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 72bpm; }

    sound "piano" kind instrument { range A0..C8; }

    track "Piano" role Instrument sound "piano" {
      place 1:1 progression();
    }
  };
}`
  },
  {
    name: 'Drum Pattern',
    code: `import { repeat } from "std:core";
import { kick, snare, hhc, hho } from "std:drums";

fn rockBeat() -> Clip {
  return clip {
    hit(kick, q, vel: 0.9);
    hit(hhc, q, vel: 0.5);
    hit(snare, q, vel: 0.85);
    hit(hhc, q, vel: 0.5);
    hit(kick, q, vel: 0.8);
    hit(kick, e, vel: 0.7);
    rest(e);
    hit(snare, q, vel: 0.85);
    hit(hho, q, vel: 0.6);
  };
}

export fn main() -> Score {
  return score {
    meta { title "Rock Beat"; }
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 110bpm; }

    sound "kit" kind drumKit {
      drumKeys { kick; snare; hhc; hho; }
    }

    track "Drums" role Drums sound "kit" {
      place 1:1 repeat(rockBeat(), 4);
    }
  };
}`
  },
  {
    name: 'Vocal with Lyrics',
    code: `import * as vocal from "std:vocal";

fn vocalPart() -> Clip {
  let c = clip {
    note(C4, q, vel: 0.75);
    note(D4, q, vel: 0.75);
    note(E4, h, vel: 0.78);
    note(D4, q, vel: 0.75);
    note(C4, q, vel: 0.75);
    note(D4, h, vel: 0.78);
  };

  const lyr = vocal.text("hel lo world hel lo world", "en-US");
  c = vocal.align(c, lyr);
  c = vocal.autoBreath(c);
  return vocal.vibrato(c, depth: 0.2);
}

export fn main() -> Score {
  return score {
    meta { title "Vocal Demo"; }
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 90bpm; }

    sound "vocal" kind vocal {
      vocal { lang "en-US"; range C3..C5; }
    }

    track "Lead" role Vocal sound "vocal" {
      place 1:1 vocalPart();
    }
  };
}`
  }
]

export function Playground() {
  const { t } = useI18n()
  let editorContainer: HTMLDivElement | undefined
  let editor: import('monaco-editor').editor.IStandaloneCodeEditor | undefined
  let collabDoc: Y.Doc | null = null
  let collabText: Y.Text | null = null
  let collabProvider: WebsocketProvider | null = null
  let collabDispose: (() => void) | null = null
  let collabApplying = false
  let lastCompiledCode = ''
  let lastCompileResult: { success: boolean; diagnostics: Diagnostic[]; ir?: ScoreIR; ast?: object } | null = null

  const [code, setCode] = createSignal(defaultCode)
  const [output, setOutput] = createSignal('')
  const [isCompiling, setIsCompiling] = createSignal(false)
  const [monacoLoaded, setMonacoLoaded] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal<'ir' | 'ast'>('ir')
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [currentIR, setCurrentIR] = createSignal<ScoreIR | null>(null)
  const [authName, setAuthName] = createSignal('')
  const [projectName, setProjectName] = createSignal('')
  const [selectedProjectId, setSelectedProjectId] = createSignal<string | null>(null)
  const [statusMessage, setStatusMessage] = createSignal('')
  const [aiTab, setAiTab] = createSignal<'compose' | 'explain' | 'chat' | 'inline' | 'agent'>('compose')
  const [aiPrompt, setAiPrompt] = createSignal('')
  const [aiResponse, setAiResponse] = createSignal('')
  const [aiMessages, setAiMessages] = createSignal<AiMessage[]>([])
  const [chatInput, setChatInput] = createSignal('')
  const [inlineSuggestion, setInlineSuggestion] = createSignal('')
  const [agentTask, setAgentTask] = createSignal('')
  const [agentSummary, setAgentSummary] = createSignal('')
  const [aiBusy, setAiBusy] = createSignal(false)
  const [collabRoom, setCollabRoom] = createSignal('')
  const [collabStatus, setCollabStatus] = createSignal<'offline' | 'connecting' | 'connected'>('offline')

  const flashStatus = (message: string) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(''), 2000)
  }

  createEffect(() => {
    user()
    setSelectedProjectId(null)
    setProjectName('')
  })

  createEffect(() => {
    activeTab()
    if (lastCompileResult) {
      renderCompileOutput(lastCompileResult)
    }
  })

  const handleSignIn = () => {
    if (!signIn(authName())) {
      flashStatus('Enter a username to sign in.')
      return
    }
    setAuthName('')
    flashStatus('Signed in.')
  }

  const handleSelectProject = (id: string) => {
    if (!id) {
      setSelectedProjectId(null)
      setProjectName('')
      return
    }
    const project = getProject(id)
    if (!project) return
    setSelectedProjectId(project.id)
    setProjectName(project.name)
    setCode(project.code)
    if (editor) {
      editor.setValue(project.code)
    }
    flashStatus('Project loaded.')
  }

  const handleSaveProject = () => {
    if (!user()) {
      flashStatus('Sign in to save projects.')
      return
    }
    const saved = saveProject(projectName(), code(), selectedProjectId() ?? undefined)
    if (!saved) return
    setSelectedProjectId(saved.id)
    setProjectName(saved.name)
    flashStatus('Project saved.')
  }

  const handleDeleteProject = () => {
    const id = selectedProjectId()
    if (!id) return
    if (!deleteProject(id)) return
    setSelectedProjectId(null)
    setProjectName('')
    flashStatus('Project deleted.')
  }

  const collabEndpoint = () => (import.meta as any).env?.VITE_TAKOMUSIC_COLLAB_URL || 'ws://localhost:8787'

  const attachCollabBinding = () => {
    if (!editor || !collabText || !window.monaco) return
    const model = editor.getModel()
    if (!model) return

    const handleRemoteUpdate = (event: Y.YTextEvent) => {
      if (collabApplying) return
      const edits: { range: any; text: string }[] = []
      let index = 0
      for (const op of event.delta) {
        if (op.retain) {
          index += op.retain
        } else if (op.delete) {
          const start = model.getPositionAt(index)
          const end = model.getPositionAt(index + op.delete)
          edits.push({
            range: new window.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
            text: '',
          })
        } else if (op.insert) {
          const pos = model.getPositionAt(index)
          edits.push({
            range: new window.monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text: op.insert,
          })
          index += op.insert.length
        }
      }
      if (edits.length === 0) return
      collabApplying = true
      model.applyEdits(edits)
      collabApplying = false
      setCode(model.getValue())
    }

    collabText.observe(handleRemoteUpdate)

    collabDispose = () => {
      collabText?.unobserve(handleRemoteUpdate)
      collabDispose = null
    }
  }

  const disconnectCollab = () => {
    collabDispose?.()
    collabProvider?.destroy()
    collabDoc?.destroy()
    collabDoc = null
    collabText = null
    collabProvider = null
    collabApplying = false
    setCollabStatus('offline')
  }

  const connectCollab = () => {
    if (!editor) {
      flashStatus('Editor not ready.')
      return
    }
    const room = collabRoom().trim()
    if (!room) {
      flashStatus('Enter a room name.')
      return
    }
    disconnectCollab()
    setCollabStatus('connecting')
    collabDoc = new Y.Doc()
    collabText = collabDoc.getText('code')
    collabProvider = new WebsocketProvider(collabEndpoint(), room, collabDoc)
    collabProvider.on('status', (event) => {
      setCollabStatus(event.status === 'connected' ? 'connected' : 'offline')
    })
    if (collabText.length === 0) {
      collabApplying = true
      collabText.insert(0, editor.getValue())
      collabApplying = false
    } else {
      collabApplying = true
      editor.setValue(collabText.toString())
      collabApplying = false
      setCode(editor.getValue())
    }
    attachCollabBinding()
    flashStatus('Collab connected.')
  }

  const extractSelection = () => {
    if (!editor) return ''
    const selection = editor.getSelection()
    if (!selection || selection.isEmpty()) return ''
    const model = editor.getModel()
    if (!model) return ''
    return model.getValueInRange(selection)
  }

  type AgentPayload = {
    summary?: string
    files?: AiFile[]
  }

  const extractJsonBlock = (text: string): string => {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    return (match?.[1] ?? text).trim()
  }

  const parseAgentPayload = (text: string): AgentPayload | null => {
    const jsonText = extractJsonBlock(text)
    try {
      return JSON.parse(jsonText) as AgentPayload
    } catch {
      return null
    }
  }

  const normalizeInlineText = (text: string): string => {
    const code = extractCodeBlock(text)
    return code.replace(/```/g, '').trim()
  }

  const getInlineContext = () => {
    if (!editor || !window.monaco) return null
    const model = editor.getModel()
    const position = editor.getPosition()
    if (!model || !position) return null
    const startLine = Math.max(1, position.lineNumber - 40)
    const prefixRange = new window.monaco.Range(startLine, 1, position.lineNumber, position.column)
    const prefix = model.getValueInRange(prefixRange).slice(-2000)
    const endLine = Math.min(model.getLineCount(), position.lineNumber + 20)
    const endCol = model.getLineContent(endLine).length + 1
    const suffixRange = new window.monaco.Range(position.lineNumber, position.column, endLine, endCol)
    const suffix = model.getValueInRange(suffixRange).slice(0, 800)
    return { prefix, suffix, position }
  }

  const buildAgentPath = (): string => {
    const raw = projectName().trim() || 'main.mf'
    const safe = raw.replace(/[^A-Za-z0-9._-]/g, '_')
    if (!safe) return 'main.mf'
    return safe.endsWith('.mf') ? safe : `${safe}.mf`
  }

  const handleComposeAi = async () => {
    const prompt = aiPrompt().trim()
    if (!prompt) {
      flashStatus('Enter a prompt to compose.')
      return
    }
    if (!canAfford('compose')) {
      flashStatus(`Not enough credits. Need ${getCreditCost('compose')}.`)
      return
    }
    setAiBusy(true)
    setAiResponse('')
    try {
      const result = await composeAi(prompt, user() ?? 'guest')
      if (!result.ok || !result.text) {
        flashStatus(result.error ?? 'AI compose failed.')
        return
      }
      setAiResponse(result.text)
      const codeBlock = extractCodeBlock(result.text)
      if (codeBlock) {
        setCode(codeBlock)
        editor?.setValue(codeBlock)
      }
      if (typeof result.remainingCredits === 'number') {
        syncCredits(result.remainingCredits)
      } else {
        applyCreditSpend('compose')
      }
    } finally {
      setAiBusy(false)
    }
  }

  const handleExplainAi = async () => {
    const selection = extractSelection()
    const targetCode = selection || code()
    if (!targetCode.trim()) {
      flashStatus('No code to explain.')
      return
    }
    if (!canAfford('explain')) {
      flashStatus(`Not enough credits. Need ${getCreditCost('explain')}.`)
      return
    }
    setAiBusy(true)
    setAiResponse('')
    try {
      const result = await explainAi(targetCode, aiPrompt().trim() || undefined, user() ?? 'guest')
      if (!result.ok || !result.text) {
        flashStatus(result.error ?? 'AI explain failed.')
        return
      }
      setAiResponse(result.text)
      if (typeof result.remainingCredits === 'number') {
        syncCredits(result.remainingCredits)
      } else {
        applyCreditSpend('explain')
      }
    } finally {
      setAiBusy(false)
    }
  }

  const handleChatSend = async () => {
    const prompt = chatInput().trim()
    if (!prompt) return
    if (!canAfford('chat')) {
      flashStatus(`Not enough credits. Need ${getCreditCost('chat')}.`)
      return
    }
    const nextMessages = [...aiMessages(), { role: 'user', content: prompt }]
    setAiMessages(nextMessages)
    setChatInput('')
    setAiBusy(true)
    try {
      const result = await chatAi(nextMessages, user() ?? 'guest')
      if (!result.ok || !result.text) {
        flashStatus(result.error ?? 'AI chat failed.')
        return
      }
      setAiMessages([...nextMessages, { role: 'assistant', content: result.text }])
      if (typeof result.remainingCredits === 'number') {
        syncCredits(result.remainingCredits)
      } else {
        applyCreditSpend('chat')
      }
    } finally {
      setAiBusy(false)
    }
  }

  const handleClearChat = () => {
    setAiMessages([])
  }

  const handleInlineAi = async () => {
    if (!canAfford('inline')) {
      flashStatus(`Not enough credits. Need ${getCreditCost('inline')}.`)
      return
    }
    const context = getInlineContext()
    if (!context) {
      flashStatus('Editor not ready.')
      return
    }
    if (context.prefix.trim().length < 8) {
      flashStatus('Place the cursor after some code to continue.')
      return
    }
    setAiBusy(true)
    setInlineSuggestion('')
    try {
      const result = await inlineAi(context.prefix, context.suffix, user() ?? 'guest')
      if (!result.ok || !result.text) {
        flashStatus(result.error ?? 'AI inline failed.')
        return
      }
      const suggestion = normalizeInlineText(result.text)
      if (!suggestion) {
        flashStatus('AI returned an empty suggestion.')
        return
      }
      setInlineSuggestion(suggestion)
      editor?.executeEdits('ai-inline', [
        {
          range: new window.monaco.Range(
            context.position.lineNumber,
            context.position.column,
            context.position.lineNumber,
            context.position.column
          ),
          text: suggestion,
        },
      ])
      editor?.focus()
      if (typeof result.remainingCredits === 'number') {
        syncCredits(result.remainingCredits)
      } else {
        applyCreditSpend('inline')
      }
    } finally {
      setAiBusy(false)
    }
  }

  const handleAgentAi = async () => {
    const task = agentTask().trim()
    if (!task) {
      flashStatus('Describe what you want the agent to change.')
      return
    }
    if (!canAfford('agent')) {
      flashStatus(`Not enough credits. Need ${getCreditCost('agent')}.`)
      return
    }
    const path = buildAgentPath()
    setAiBusy(true)
    setAgentSummary('')
    try {
      const result = await agentAi(task, [{ path, content: code() }], user() ?? 'guest')
      if (!result.ok || !result.text) {
        flashStatus(result.error ?? 'AI agent failed.')
        return
      }
      const payload = parseAgentPayload(result.text)
      if (!payload?.files || payload.files.length === 0) {
        flashStatus('AI agent returned no changes.')
        return
      }
      const target = payload.files.find((file) => file.path === path) ?? payload.files[0]
      if (!target?.content) {
        flashStatus('AI agent response missing content.')
        return
      }
      setAgentSummary(payload.summary || 'Agent applied updates.')
      setCode(target.content)
      editor?.setValue(target.content)
      if (typeof result.remainingCredits === 'number') {
        syncCredits(result.remainingCredits)
      } else {
        applyCreditSpend('agent')
      }
    } finally {
      setAiBusy(false)
    }
  }

  const handleDownloadMidi = async () => {
    if (isCompiling()) return
    if (!currentIR()) {
      await compile()
    }
    const ir = currentIR()
    if (!ir) {
      flashStatus('Compile failed. MIDI not generated.')
      return
    }
    try {
      downloadMidi(ir, projectName() || ir.meta?.title)
      flashStatus('MIDI downloaded.')
    } catch {
      flashStatus('MIDI export failed.')
    }
  }

  const initMonaco = () => {
    if (!editorContainer || !window.monaco) return

    // Register Tako language
    window.monaco.languages.register({ id: 'takomusic' })

    // Set token provider
    window.monaco.languages.setMonarchTokensProvider('takomusic', {
      keywords: ['fn', 'const', 'let', 'if', 'else', 'for', 'in', 'return', 'match', 'import', 'export', 'from'],
      scoreKeywords: ['score', 'clip', 'sound', 'track', 'meta', 'tempo', 'meter', 'place', 'role', 'kind', 'vocal', 'drumKeys', 'marker'],
      typeKeywords: ['Clip', 'Score', 'Track', 'Instrument', 'Drums', 'Vocal', 'Automation', 'instrument', 'drumKit', 'fx'],
      builtins: ['note', 'chord', 'hit', 'rest', 'breath', 'cc', 'automation', 'at'],
      stdFunctions: ['length', 'concat', 'overlay', 'repeat', 'slice', 'shift', 'padTo', 'mapEvents', 'updateEvent',
                     'transpose', 'stretch', 'quantize', 'swing', 'humanize', 'linear', 'easeInOut', 'piecewise',
                     'majorTriad', 'minorTriad', 'text', 'syllables', 'align', 'vibrato', 'autoBreath'],
      drumKeys: ['kick', 'snare', 'hhc', 'hho', 'crash', 'ride', 'tom1', 'tom2', 'tom3', 'clap'],
      durations: ['w', 'h', 'q', 'e', 's', 't', 'x'],

      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/\b(true|false|null)\b/, 'constant'],
          [/\b[A-G][#b]?-?\d+([+-]\d+c)?\b/, 'number.pitch'],
          [/\b\d+:\d+\b/, 'number.time'],
          [/\b\d+bpm\b/, 'number.tempo'],
          [/\b\d+\/\d+\b/, 'number.meter'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/\b(w|h|q|e|s|t|x)\.?\b/, 'number.duration'],
          [/->/, 'operator.arrow'],
          [/[+\-*/%=<>!&|?]+/, 'operator'],
          [/[{}()\[\];,:]/, 'delimiter'],
          [/\b(fn|const|let|if|else|for|in|return|match|import|export|from)\b/, 'keyword'],
          [/\b(score|clip|sound|track|meta|tempo|meter|place|role|kind|vocal|drumKeys|marker)\b/, 'keyword.score'],
          [/\b(Clip|Score|Track|Instrument|Drums|Vocal|Automation|instrument|drumKit|fx)\b/, 'type'],
          [/\b(note|chord|hit|rest|breath|cc|automation|at)\b/, 'function.builtin'],
          [/\b(kick|snare|hhc|hho|crash|ride|tom1|tom2|tom3|clap)\b/, 'variable.drum'],
          [/\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, 'function'],
          [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, 'identifier'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      },
    })

    // Define theme
    window.monaco.editor.defineTheme('tako-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c586c0' },
        { token: 'keyword.score', foreground: '569cd6' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'function', foreground: 'dcdcaa' },
        { token: 'function.builtin', foreground: 'dcdcaa', fontStyle: 'bold' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'number.pitch', foreground: '9cdcfe' },
        { token: 'number.duration', foreground: 'b5cea8', fontStyle: 'italic' },
        { token: 'number.time', foreground: 'd7ba7d' },
        { token: 'number.tempo', foreground: 'd7ba7d' },
        { token: 'number.meter', foreground: 'd7ba7d' },
        { token: 'variable.drum', foreground: '9cdcfe' },
        { token: 'operator.arrow', foreground: 'd4d4d4' },
        { token: 'comment', foreground: '6a9955' },
        { token: 'constant', foreground: '569cd6' },
      ],
      colors: {
        'editor.background': '#1e293b',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorCursor.foreground': '#aeafad',
        'editor.selectionBackground': '#264f78',
      },
    })

    editor = window.monaco.editor.create(editorContainer, {
      value: code(),
      language: 'takomusic',
      theme: 'tako-dark',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      padding: { top: 16, bottom: 16 },
    })

    editor.onDidChangeModelContent((event) => {
      if (!editor) return
      const value = editor.getValue()
      setCode(value)
      lastCompileResult = null
      if (!collabText || collabApplying || !collabDoc) return
      const changes = [...event.changes].sort((a, b) => b.rangeOffset - a.rangeOffset)
      collabDoc.transact(() => {
        for (const change of changes) {
          if (change.rangeLength) {
            collabText.delete(change.rangeOffset, change.rangeLength)
          }
          if (change.text) {
            collabText.insert(change.rangeOffset, change.text)
          }
        }
      })
    })
  }

  onMount(() => {
    // Load Monaco from CDN
    const loaderScript = document.createElement('script')
    loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js'
    loaderScript.onload = () => {
      window.require.config({
        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
      })
      window.require(['vs/editor/editor.main'], () => {
        setMonacoLoaded(true)
        initMonaco()
      })
    }
    document.head.appendChild(loaderScript)
  })

  onCleanup(() => {
    disconnectCollab()
    editor?.dispose()
    getAudioPlayer().dispose()
  })

  const renderCompileOutput = (result: {
    success: boolean
    diagnostics: Diagnostic[]
    ir?: ScoreIR
    ast?: object
  }) => {
    if (!result.success) {
      const errorOutput = result.diagnostics
        .map((d: Diagnostic) => {
          const loc = d.line ? `${d.line}:${d.column ?? 1}` : ''
          const prefix = d.severity === 'error' ? 'error' : 'warning'
          return loc ? `${prefix}: ${d.message}\n  --> main.mf:${loc}` : `${prefix}: ${d.message}`
        })
        .join('\n\n')
      setOutput(errorOutput)
      return
    }

    if (result.ir) {
      setCurrentIR(result.ir as ScoreIR)
    }
    const outputData = activeTab() === 'ir' ? result.ir : result.ast
    setOutput(JSON.stringify(outputData, null, 2))
  }

  const compile = async () => {
    if (code() === lastCompiledCode && lastCompileResult) {
      renderCompileOutput(lastCompileResult)
      return
    }
    setIsCompiling(true)
    setOutput('')
    setCurrentIR(null)

    try {
      // Use real TakoMusic compiler
      const result = await takoCompile(code())

      lastCompiledCode = code()
      lastCompileResult = result
      renderCompileOutput(result)
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsCompiling(false)
    }
  }

  const togglePlayback = async () => {
    const player = getAudioPlayer()

    if (isPlaying()) {
      player.stop()
      setIsPlaying(false)
    } else {
      const ir = currentIR()
      if (!ir) {
        // Compile first if no IR
        await compile()
        const newIR = currentIR()
        if (!newIR) return
        setIsPlaying(true)
        await player.play(newIR, () => setIsPlaying(false))
      } else {
        setIsPlaying(true)
        await player.play(ir, () => setIsPlaying(false))
      }
    }
  }

  const loadExample = (exampleCode: string) => {
    setCode(exampleCode)
    if (editor) {
      editor.setValue(exampleCode)
    }
  }

  return (
    <section id="playground" class="container mx-auto px-6 py-24">
      <h2 class="text-3xl md:text-4xl font-bold text-center mb-4">
        {t().playground?.title || 'Playground'}
      </h2>
      <p class="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
        {t().playground?.description || 'Try TakoMusic in your browser. Write code and see the generated IR.'}
      </p>

      <div class="max-w-6xl mx-auto mb-6 flex flex-col gap-3">
        <div class="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div class="flex items-center gap-3">
            <Show
              when={user()}
              fallback={
                <div class="flex items-center gap-2">
                  <input
                    value={authName()}
                    onInput={(event) => setAuthName(event.currentTarget.value)}
                    placeholder="username"
                    class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                  <button
                    onClick={handleSignIn}
                    class="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              }
            >
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <span>Signed in as</span>
                <span class="text-sky-400 font-semibold">{user()}</span>
                <button
                  onClick={signOut}
                  class="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            </Show>
            <div class="text-xs text-slate-400">
              AI Credits <span class="text-sky-400 font-semibold">{credits()}</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              value={projectName()}
              onInput={(event) => setProjectName(event.currentTarget.value)}
              placeholder="Project name"
              class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
            <button
              onClick={handleSaveProject}
              class="px-3 py-2 text-sm bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
            >
              Save
            </button>
            <select
              value={selectedProjectId() ?? ''}
              onChange={(event) => handleSelectProject(event.currentTarget.value)}
              class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="">New project</option>
              {projects().map((project) => (
                <option value={project.id}>{project.name}</option>
              ))}
            </select>
            <button
              onClick={handleDeleteProject}
              class="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        <Show when={statusMessage()}>
          <div class="text-xs text-slate-400">{statusMessage()}</div>
        </Show>
        <div class="flex flex-wrap items-center gap-2">
          <input
            value={collabRoom()}
            onInput={(event) => setCollabRoom(event.currentTarget.value)}
            placeholder="Collab room"
            class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
          />
          <button
            onClick={connectCollab}
            class="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Connect
          </button>
          <button
            onClick={disconnectCollab}
            class="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Disconnect
          </button>
          <span class="text-xs text-slate-500">Status: {collabStatus()}</span>
        </div>
      </div>

      {/* Example snippets */}
      <div class="flex flex-wrap justify-center gap-2 mb-6">
        {exampleSnippets.map((snippet) => (
          <button
            onClick={() => loadExample(snippet.code)}
            class="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {snippet.name}
          </button>
        ))}
      </div>

      <div class="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Editor */}
        <div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <div class="w-3 h-3 rounded-full bg-green-500" />
              <span class="ml-4 text-slate-400 text-sm font-mono">main.mf</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={compile}
                disabled={isCompiling()}
                class="px-4 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
              >
                {isCompiling() ? (
                  <>
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t().playground?.compiling || 'Compiling...'}
                  </>
                ) : (
                  <>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {t().playground?.compile || 'Compile'}
                  </>
                )}
              </button>
              <button
                onClick={togglePlayback}
                disabled={isCompiling()}
                class={`px-4 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                  isPlaying()
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-green-600 hover:bg-green-500'
                } disabled:bg-slate-600`}
              >
                {isPlaying() ? (
                  <>
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadMidi}
                disabled={isCompiling()}
                class="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2 disabled:bg-slate-600"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                MIDI
              </button>
            </div>
          </div>
          <Show
            when={monacoLoaded()}
            fallback={
              <div class="h-96 flex items-center justify-center text-slate-400">
                <svg class="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading editor...
              </div>
            }
          >
            <div ref={editorContainer} class="h-96" />
          </Show>
        </div>

        {/* Output */}
        <div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div class="flex items-center px-4 py-3 border-b border-slate-700">
            <div class="flex gap-2">
              <button
                onClick={() => setActiveTab('ir')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab() === 'ir' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Score IR
              </button>
              <button
                onClick={() => setActiveTab('ast')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab() === 'ast' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                AST
              </button>
            </div>
          </div>
          <div class="h-96 overflow-auto p-4">
            <Show
              when={output()}
              fallback={
                <div class="h-full flex items-center justify-center text-slate-500">
                  <div class="text-center">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>{t().playground?.clickCompile || 'Click "Compile" to see the output'}</p>
                  </div>
                </div>
              }
            >
              <pre class="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                <code>{output()}</code>
              </pre>
            </Show>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto mt-8">
        <div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 border-b border-slate-700">
            <div class="flex items-center gap-2">
              <button
                onClick={() => setAiTab('compose')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  aiTab() === 'compose' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Compose
              </button>
              <button
                onClick={() => setAiTab('explain')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  aiTab() === 'explain' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Explain
              </button>
              <button
                onClick={() => setAiTab('chat')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  aiTab() === 'chat' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setAiTab('inline')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  aiTab() === 'inline' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Inline
              </button>
              <button
                onClick={() => setAiTab('agent')}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  aiTab() === 'agent' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Agent
              </button>
            </div>
            <div class="text-xs text-slate-500">
              Compose {getCreditCost('compose')} · Explain {getCreditCost('explain')} · Chat {getCreditCost('chat')} · Inline {getCreditCost('inline')} · Agent {getCreditCost('agent')}
            </div>
          </div>

          <div class="p-4">
            <Show when={aiTab() === 'chat'}>
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">Conversation</span>
                  <button
                    onClick={handleClearChat}
                    class="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                </div>
                <div class="max-h-64 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-3 flex flex-col gap-2">
                  <Show
                    when={aiMessages().length > 0}
                    fallback={<div class="text-xs text-slate-500">No messages yet.</div>}
                  >
                    {aiMessages().map((msg) => (
                      <div
                        class={`rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'assistant'
                            ? 'bg-slate-700 text-slate-100'
                            : 'bg-slate-950 text-slate-200 self-end'
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                  </Show>
                </div>
                <div class="flex flex-col md:flex-row gap-2">
                  <textarea
                    value={chatInput()}
                    onInput={(event) => setChatInput(event.currentTarget.value)}
                    placeholder="Ask about structure, harmony, or how to improve the code..."
                    class="flex-1 min-h-[90px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={aiBusy()}
                    class="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg transition-colors"
                  >
                    {aiBusy() ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </Show>

            <Show when={aiTab() === 'compose' || aiTab() === 'explain'}>
              <div class="flex flex-col gap-3">
                <textarea
                  value={aiPrompt()}
                  onInput={(event) => setAiPrompt(event.currentTarget.value)}
                  placeholder={
                    aiTab() === 'compose'
                      ? 'Describe the mood, tempo, instruments, or structure you want...'
                      : 'Optional: focus on harmony, form, or performance tips...'
                  }
                  class="min-h-[120px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
                <button
                  onClick={() => (aiTab() === 'compose' ? handleComposeAi() : handleExplainAi())}
                  disabled={aiBusy()}
                  class="self-start px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg transition-colors"
                >
                  {aiBusy() ? 'Thinking...' : aiTab() === 'compose' ? 'Compose' : 'Explain'}
                </button>
                <Show when={aiResponse()}>
                  <div class="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <pre class="text-sm text-slate-200 whitespace-pre-wrap">
                      <code>{aiResponse()}</code>
                    </pre>
                  </div>
                </Show>
              </div>
            </Show>

            <Show when={aiTab() === 'inline'}>
              <div class="flex flex-col gap-3">
                <p class="text-sm text-slate-400">
                  Place the cursor where you want a continuation and click Suggest.
                </p>
                <button
                  onClick={handleInlineAi}
                  disabled={aiBusy()}
                  class="self-start px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg transition-colors"
                >
                  {aiBusy() ? 'Thinking...' : 'Suggest'}
                </button>
                <Show when={inlineSuggestion()}>
                  <div class="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <pre class="text-sm text-slate-200 whitespace-pre-wrap">
                      <code>{inlineSuggestion()}</code>
                    </pre>
                  </div>
                </Show>
              </div>
            </Show>

            <Show when={aiTab() === 'agent'}>
              <div class="flex flex-col gap-3">
                <textarea
                  value={agentTask()}
                  onInput={(event) => setAgentTask(event.currentTarget.value)}
                  placeholder="Describe the edits you want applied to the current code..."
                  class="min-h-[120px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
                <button
                  onClick={handleAgentAi}
                  disabled={aiBusy()}
                  class="self-start px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg transition-colors"
                >
                  {aiBusy() ? 'Thinking...' : 'Run Agent'}
                </button>
                <Show when={agentSummary()}>
                  <div class="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
                    {agentSummary()}
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </div>

      <p class="text-center text-slate-500 text-sm mt-6">
        {t().playground?.note || 'Note: This playground validates syntax and shows IR structure. For full compilation, install TakoMusic locally.'}
      </p>
    </section>
  )
}
