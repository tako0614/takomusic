import { createSignal, onMount, onCleanup, Show } from 'solid-js'
import { useI18n } from '../i18n'
import { compile as takoCompile, type Diagnostic } from '../lib/compiler'
import { getAudioPlayer, type ScoreIR } from '../lib/audioPlayer'

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

  const [code, setCode] = createSignal(defaultCode)
  const [output, setOutput] = createSignal('')
  const [isCompiling, setIsCompiling] = createSignal(false)
  const [monacoLoaded, setMonacoLoaded] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal<'ir' | 'ast'>('ir')
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [currentIR, setCurrentIR] = createSignal<ScoreIR | null>(null)

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

    editor.onDidChangeModelContent(() => {
      setCode(editor!.getValue())
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
    editor?.dispose()
    getAudioPlayer().dispose()
  })

  const compile = async () => {
    setIsCompiling(true)
    setOutput('')
    setCurrentIR(null)

    try {
      // Use real TakoMusic compiler
      const result = await takoCompile(code())

      if (!result.success) {
        // Format diagnostics
        const errorOutput = result.diagnostics
          .map((d: Diagnostic) => {
            const loc = d.line ? `${d.line}:${d.column ?? 1}` : ''
            const prefix = d.severity === 'error' ? 'error' : 'warning'
            return loc ? `${prefix}: ${d.message}\n  --> main.mf:${loc}` : `${prefix}: ${d.message}`
          })
          .join('\n\n')
        setOutput(errorOutput)
      } else {
        // Store IR for playback
        if (result.ir) {
          setCurrentIR(result.ir as ScoreIR)
        }
        // Show IR or AST based on active tab
        const outputData = activeTab() === 'ir' ? result.ir : result.ast
        setOutput(JSON.stringify(outputData, null, 2))
      }
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

      <p class="text-center text-slate-500 text-sm mt-6">
        {t().playground?.note || 'Note: This playground validates syntax and shows IR structure. For full compilation, install TakoMusic locally.'}
      </p>
    </section>
  )
}
