export const translations = {
  ja: {
    // Navigation
    nav: {
      features: '機能',
      example: '例',
      github: 'GitHub',
    },
    // Hero
    hero: {
      title: 'Music as Code',
      subtitle: '音楽作成のためのドメイン固有言語',
      subtitleLine2: 'VSQX、MusicXML、MIDIに一度の記述で出力',
      seeExample: '例を見る',
      version: 'v1.1.0',
      license: 'AGPL-3.0',
      copied: 'コピー済み',
    },
    // Features
    features: {
      title: '作曲に必要なすべてを',
      simpleSyntax: {
        title: 'シンプルな構文',
        description: '直感的なピッチ（C4, D#5）とデュレーション（1/4, 1/8）リテラルで音楽を記述',
      },
      multiFormat: {
        title: 'マルチフォーマット出力',
        description: 'Vocaloid用VSQX、NEUTRINO用MusicXML、楽器用MIDIを生成',
      },
      moduleSystem: {
        title: 'モジュールシステム',
        description: 'インポート・エクスポートでコードを整理。ドラムパターン、コード進行などを再利用',
      },
      staticAnalysis: {
        title: '静的解析',
        description: 'レンダリング前にエラーを検出：ボーカルの重複、歌詞の欠落、音域外のピッチ',
      },
      watchMode: {
        title: 'ウォッチモード',
        description: 'ファイル変更時に自動リビルド。即座のフィードバックで素早く反復',
      },
      cliTools: {
        title: 'CLIツール',
        description: 'init, build, check, fmt, render, doctor - 必要なすべてが1つのツールチェーンに',
      },
    },
    // Code Example
    example: {
      title: 'シンプルで読みやすい構文',
      description: 'コードを書くように音楽を書く。TakoMusicの構文は直感的で表現力豊かに設計されています。',
      output: '出力',
    },
    // CLI
    cli: {
      title: 'パワフルなCLI',
      commands: {
        init: '新規プロジェクト作成',
        build: 'ウォッチモードでビルド',
        check: '静的解析を実行',
        render: 'NEUTRINO + FluidSynthでレンダリング',
        doctor: '依存関係をチェック',
      },
    },
    // CTA
    cta: {
      title: '今すぐ作曲を始めよう',
      description: 'TakoMusicはオープンソースで無料で使えます。コミュニティに参加してコードで音楽を作りましょう。',
      viewGithub: 'GitHubで見る',
      getStarted: '始める',
    },
    // Footer
    footer: {
      madeWith: '音楽とコードへの愛を込めて作りました',
      copyright: 'AGPL-3.0ライセンス',
    },
  },
  en: {
    // Navigation
    nav: {
      features: 'Features',
      example: 'Example',
      github: 'GitHub',
    },
    // Hero
    hero: {
      title: 'Music as Code',
      subtitle: 'A domain-specific language for music composition.',
      subtitleLine2: 'Write once, export to VSQX, MusicXML, and MIDI.',
      seeExample: 'See Example',
      version: 'v1.1.0',
      license: 'AGPL-3.0',
      copied: 'Copied',
    },
    // Features
    features: {
      title: 'Everything you need to compose',
      simpleSyntax: {
        title: 'Simple Syntax',
        description: 'Write music using intuitive pitch (C4, D#5) and duration (1/4, 1/8) literals',
      },
      multiFormat: {
        title: 'Multi-Format Export',
        description: 'Generate VSQX for Vocaloid, MusicXML for NEUTRINO, and MIDI for instruments',
      },
      moduleSystem: {
        title: 'Module System',
        description: 'Organize your music with imports and exports. Reuse drum patterns, chord progressions, and more',
      },
      staticAnalysis: {
        title: 'Static Analysis',
        description: 'Catch errors before rendering: overlapping vocals, missing lyrics, out-of-range pitches',
      },
      watchMode: {
        title: 'Watch Mode',
        description: 'Auto-rebuild on file changes. Iterate quickly with instant feedback',
      },
      cliTools: {
        title: 'CLI Tools',
        description: 'init, build, check, fmt, render, doctor - everything you need in one toolchain',
      },
    },
    // Code Example
    example: {
      title: 'Simple, Readable Syntax',
      description: "Write music like you write code. TakoMusic's syntax is designed to be intuitive and expressive.",
      output: 'Output',
    },
    // CLI
    cli: {
      title: 'Powerful CLI',
      commands: {
        init: 'Create a new project',
        build: 'Build with watch mode',
        check: 'Run static analysis',
        render: 'Render using NEUTRINO + FluidSynth',
        doctor: 'Check dependencies',
      },
    },
    // CTA
    cta: {
      title: 'Start composing today',
      description: 'TakoMusic is open source and free to use. Join the community and start making music with code.',
      viewGithub: 'View on GitHub',
      getStarted: 'Get Started',
    },
    // Footer
    footer: {
      madeWith: 'Made with love for music and code.',
      copyright: 'AGPL-3.0 License',
    },
  },
} as const

export type Language = keyof typeof translations
export type TranslationKeys = typeof translations['en']
