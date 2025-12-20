import { createSignal, For } from 'solid-js'
import { useI18n } from './i18n'
import { LanguageSwitcher } from './components/LanguageSwitcher'

const codeExample = `import { majorTriad, dominantSeventh } from "std:theory";
import { euclidean } from "std:patterns";

export proc main() {
  title("My Song");
  tempo(120);
  timeSig(4, 4);

  track(midi, piano, { ch: 1 }) {
    at(1:1);
    chord(majorTriad(C4), 1/2);
    chord(dominantSeventh(G3), 1/2);
  }

  track(midi, drums, { ch: 10 }) {
    at(1:1);
    const pattern = euclidean(5, 8);
    for (i in 0..8) {
      if (pattern[i]) { drum(kick, 1/8); }
      else { drum(hhc, 1/8); }
    }
  }
}`

function App() {
  const { t } = useI18n()
  const [copied, setCopied] = createSignal(false)

  const copyInstall = async () => {
    await navigator.clipboard.writeText('npm install -g takomusic')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const features = [
    {
      title: () => t.features.simpleSyntax.title,
      description: () => t.features.simpleSyntax.description,
      icon: '🎵',
    },
    {
      title: () => t.features.multiFormat.title,
      description: () => t.features.multiFormat.description,
      icon: '📦',
    },
    {
      title: () => t.features.stdlib.title,
      description: () => t.features.stdlib.description,
      icon: '📚',
    },
    {
      title: () => t.features.vscodeExtension.title,
      description: () => t.features.vscodeExtension.description,
      icon: '💻',
    },
    {
      title: () => t.features.staticAnalysis.title,
      description: () => t.features.staticAnalysis.description,
      icon: '🔍',
    },
    {
      title: () => t.features.cliTools.title,
      description: () => t.features.cliTools.description,
      icon: '🛠️',
    },
  ]

  const cliCommands = [
    { cmd: 'mf init myproject', desc: () => t.cli.commands.init },
    { cmd: 'mf build -w', desc: () => t.cli.commands.build },
    { cmd: 'mf check', desc: () => t.cli.commands.check },
    { cmd: 'mf play', desc: () => t.cli.commands.play },
    { cmd: 'mf render -p cli', desc: () => t.cli.commands.render },
  ]

  const stdlibModules = [
    { name: 'theory', desc: () => t.stdlib.modules.theory },
    { name: 'patterns', desc: () => t.stdlib.modules.patterns },
    { name: 'rhythm', desc: () => t.stdlib.modules.rhythm },
    { name: 'dynamics', desc: () => t.stdlib.modules.dynamics },
    { name: 'expression', desc: () => t.stdlib.modules.expression },
    { name: 'genres', desc: () => t.stdlib.modules.genres },
  ]

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero Section */}
      <header class="relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/20 via-transparent to-transparent" />
        <nav class="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="TakoMusic" class="w-10 h-10 rounded-full" />
            <span class="text-2xl font-bold">TakoMusic</span>
          </div>
          <div class="flex items-center gap-6">
            <a href="#features" class="hover:text-sky-400 transition-colors hidden sm:block">{t.nav.features}</a>
            <a href="#stdlib" class="hover:text-sky-400 transition-colors hidden sm:block">{t.nav.docs}</a>
            <a href="https://github.com/tako0614/takomusic" target="_blank" class="hover:text-sky-400 transition-colors hidden sm:block">{t.nav.github}</a>
            <LanguageSwitcher />
          </div>
        </nav>

        <div class="relative z-10 container mx-auto px-6 py-24 text-center">
          <h1 class="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-sky-200 to-sky-400 bg-clip-text text-transparent">
            {t.hero.title}
          </h1>
          <p class="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
            {t.hero.subtitle}
            <br />
            {t.hero.subtitleLine2}
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={copyInstall}
              class="group flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-6 py-3 font-mono text-sm transition-all"
            >
              <span class="text-slate-400">$</span>
              <span>npm install -g takomusic</span>
              <span class="text-slate-400 group-hover:text-sky-400 transition-colors">
                {copied() ? '✓' : '📋'}
              </span>
            </button>
            <a
              href="#example"
              class="bg-sky-600 hover:bg-sky-500 rounded-lg px-6 py-3 font-semibold transition-colors"
            >
              {t.hero.seeExample}
            </a>
          </div>

          <div class="flex justify-center gap-8 text-slate-400 text-sm">
            <span>{t.hero.version}</span>
            <span>{t.hero.license}</span>
            <span>TypeScript</span>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" class="container mx-auto px-6 py-24">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-16">
          {t.features.title}
        </h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <For each={features}>
            {(feature) => (
              <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-sky-500/50 transition-colors">
                <div class="text-4xl mb-4">{feature.icon}</div>
                <h3 class="text-xl font-semibold mb-2">{feature.title()}</h3>
                <p class="text-slate-400">{feature.description()}</p>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Code Example Section */}
      <section id="example" class="container mx-auto px-6 py-24">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-4">
          {t.example.title}
        </h2>
        <p class="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          {t.example.description}
        </p>

        <div class="max-w-3xl mx-auto">
          <div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
            <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <div class="w-3 h-3 rounded-full bg-green-500" />
              <span class="ml-4 text-slate-400 text-sm font-mono">src/main.mf</span>
            </div>
            <pre class="p-6 overflow-x-auto text-sm leading-relaxed">
              <code class="text-slate-300">{codeExample}</code>
            </pre>
          </div>
        </div>

        <div class="flex flex-wrap justify-center gap-4 mt-8">
          <div class="bg-slate-800 rounded-lg px-4 py-2 text-sm">
            <span class="text-slate-400">{t.example.output}:</span>
            <span class="ml-2 text-sky-400">vocal.vsqx</span>
          </div>
          <div class="bg-slate-800 rounded-lg px-4 py-2 text-sm">
            <span class="text-slate-400">{t.example.output}:</span>
            <span class="ml-2 text-sky-400">vocal.musicxml</span>
          </div>
          <div class="bg-slate-800 rounded-lg px-4 py-2 text-sm">
            <span class="text-slate-400">{t.example.output}:</span>
            <span class="ml-2 text-sky-400">band.mid</span>
          </div>
        </div>
      </section>

      {/* CLI Section */}
      <section class="container mx-auto px-6 py-24">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-12">
          {t.cli.title}
        </h2>
        <div class="max-w-2xl mx-auto space-y-4">
          <For each={cliCommands}>
            {(item) => (
              <div class="flex items-center gap-4 bg-slate-800/50 rounded-lg px-6 py-4 border border-slate-700">
                <code class="font-mono text-sky-400 flex-1">{item.cmd}</code>
                <span class="text-slate-400 text-sm">{item.desc()}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Standard Library Section */}
      <section id="stdlib" class="container mx-auto px-6 py-24">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-4">
          {t.stdlib.title}
        </h2>
        <p class="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          {t.stdlib.description}
        </p>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <For each={stdlibModules}>
            {(mod) => (
              <div class="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700">
                <code class="text-sky-400 font-mono">std:{mod.name}</code>
                <p class="text-slate-400 text-sm mt-1">{mod.desc()}</p>
              </div>
            )}
          </For>
        </div>
        <div class="text-center">
          <a
            href="https://github.com/tako0614/takomusic/blob/main/docs/STDLIB.md"
            target="_blank"
            class="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-6 py-3 font-semibold transition-colors"
          >
            {t.stdlib.viewDocs}
            <span>→</span>
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section class="container mx-auto px-6 py-24 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-6">
          {t.cta.title}
        </h2>
        <p class="text-slate-400 mb-8 max-w-xl mx-auto">
          {t.cta.description}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://github.com/tako0614/takomusic"
            target="_blank"
            class="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-8 py-3 font-semibold transition-colors"
          >
            {t.cta.viewGithub}
          </a>
          <a
            href="https://github.com/tako0614/takomusic#quick-start"
            target="_blank"
            class="bg-sky-600 hover:bg-sky-500 rounded-lg px-8 py-3 font-semibold transition-colors"
          >
            {t.cta.getStarted}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-slate-800 py-12">
        <div class="container mx-auto px-6 text-center text-slate-400">
          <div class="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="TakoMusic" class="w-8 h-8 rounded-full" />
            <span class="text-xl font-bold text-white">TakoMusic</span>
          </div>
          <p class="text-sm">
            {t.footer.madeWith}
            <br />
            {t.footer.copyright} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
