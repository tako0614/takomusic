export const translations = {
  ja: {
    // Navigation
    nav: {
      features: '機能',
      example: '例',
      docs: 'ドキュメント',
      github: 'GitHub',
    },
    // Hero
    hero: {
      title: 'Music as Code',
      subtitle: '音楽作成のためのドメイン固有言語',
      subtitleLine2: 'VSQX、MusicXML、MIDIに一度の記述で出力',
      seeExample: '例を見る',
      version: 'v1.3.0',
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
      stdlib: {
        title: '豊富な標準ライブラリ',
        description: '12モジュール、238以上の関数：音楽理論、パターン、ダイナミクス、ジャンル別機能など',
      },
      vscodeExtension: {
        title: 'VSCode拡張機能',
        description: 'シンタックスハイライト、スニペット、リアルタイムエラーチェックで快適な開発体験',
      },
      staticAnalysis: {
        title: '静的解析',
        description: 'レンダリング前にエラーを検出：ボーカルの重複、歌詞の欠落、音域外のピッチ',
      },
      cliTools: {
        title: 'CLIツール',
        description: 'init, build, check, fmt, play, render - 必要なすべてが1つのツールチェーンに',
      },
    },
    // Code Example
    example: {
      title: 'シンプルで読みやすい構文',
      description: 'コードを書くように音楽を書く。TakoMusicの構文は直感的で表現力豊かに設計されています。',
      output: '出力',
    },
    // Standard Library
    stdlib: {
      title: '標準ライブラリ',
      description: '12のモジュールで238以上の関数を提供。音楽理論からジャンル特有のパターンまで。',
      modules: {
        theory: '音楽理論（スケール、コード、ボイシング）',
        patterns: 'パターン（ユークリッドリズム、アルペジオ）',
        rhythm: 'リズム（スウィング、グルーブ、ヒューマナイズ）',
        dynamics: 'ダイナミクス（クレッシェンド、スフォルツァンド）',
        expression: '表現（ビブラート、ポルタメント、ベンド）',
        genres: 'ジャンル（ボサノバ、ファンク、EDM、ジャズ）',
      },
      viewDocs: 'ドキュメントを見る',
    },
    // CLI
    cli: {
      title: 'パワフルなCLI',
      commands: {
        init: '新規プロジェクト作成',
        build: 'ウォッチモードでビルド',
        check: '静的解析を実行',
        play: 'FluidSynthでプレビュー',
        render: 'NEUTRINO + FluidSynthでレンダリング',
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
      docs: 'Docs',
      github: 'GitHub',
    },
    // Hero
    hero: {
      title: 'Music as Code',
      subtitle: 'A domain-specific language for music composition.',
      subtitleLine2: 'Write once, export to VSQX, MusicXML, and MIDI.',
      seeExample: 'See Example',
      version: 'v1.3.0',
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
      stdlib: {
        title: 'Rich Standard Library',
        description: '12 modules, 238+ functions: music theory, patterns, dynamics, genre-specific features, and more',
      },
      vscodeExtension: {
        title: 'VSCode Extension',
        description: 'Syntax highlighting, snippets, and real-time error checking for a smooth dev experience',
      },
      staticAnalysis: {
        title: 'Static Analysis',
        description: 'Catch errors before rendering: overlapping vocals, missing lyrics, out-of-range pitches',
      },
      cliTools: {
        title: 'CLI Tools',
        description: 'init, build, check, fmt, play, render - everything you need in one toolchain',
      },
    },
    // Code Example
    example: {
      title: 'Simple, Readable Syntax',
      description: "Write music like you write code. TakoMusic's syntax is designed to be intuitive and expressive.",
      output: 'Output',
    },
    // Standard Library
    stdlib: {
      title: 'Standard Library',
      description: '12 modules with 238+ functions. From music theory to genre-specific patterns.',
      modules: {
        theory: 'Music Theory (scales, chords, voicings)',
        patterns: 'Patterns (Euclidean rhythms, arpeggios)',
        rhythm: 'Rhythm (swing, groove, humanize)',
        dynamics: 'Dynamics (crescendo, sforzando)',
        expression: 'Expression (vibrato, portamento, bends)',
        genres: 'Genres (bossa nova, funk, EDM, jazz)',
      },
      viewDocs: 'View Documentation',
    },
    // CLI
    cli: {
      title: 'Powerful CLI',
      commands: {
        init: 'Create a new project',
        build: 'Build with watch mode',
        check: 'Run static analysis',
        play: 'Preview with FluidSynth',
        render: 'Render using NEUTRINO + FluidSynth',
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
