export const translations = {
  ja: {
    // Navigation
    nav: {
      home: 'ホーム',
      features: '機能',
      example: '例',
      playground: 'Playground',
      docs: 'ドキュメント',
      github: 'GitHub',
    },
    // Hero
    hero: {
      title: 'Music as Code',
      subtitle: '中立IRに評価される作曲DSL',
      subtitleLine2: 'Render Profile + PluginでMIDI/MusicXML/DAWへ出力',
      seeExample: '例を見る',
      version: 'v4.0.0',
      license: 'AGPL-3.0',
      copied: 'コピー済み',
    },
    // Features
    features: {
      title: '作曲に必要なすべてを',
      simpleSyntax: {
        title: 'シンプルな構文',
        description: '`.mf`でscore/clipを記述。ピッチ（C4, D#5）とDur（q, 1/4）で作曲',
      },
      multiFormat: {
        title: 'マルチフォーマット出力',
        description: 'Renderer PluginでMIDI/MusicXML/DAW等へ出力。音色割当はProfileで分離',
      },
      stdlib: {
        title: '豊富な標準ライブラリ',
        description: 'std:*モジュールでClip合成や変形、歌詞処理を提供',
      },
      vscodeExtension: {
        title: 'VSCode拡張機能',
        description: 'シンタックスハイライト、スニペット、リアルタイムエラーチェックで快適な開発体験',
      },
      staticAnalysis: {
        title: '静的解析',
        description: '未定義SoundIdやrole不一致、負のduration等をレンダリング前に検出',
      },
      cliTools: {
        title: '実装パイプライン',
        description: 'Parse→型検査→IR正規化→Renderの流れを前提に設計',
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
      description: '9モジュール（analysisは任意）で中立IR向けの機能を提供。',
      modules: {
        core: 'Clip合成とScore/Track操作',
        time: '時間ユーティリティ（bar:beat, Dur）',
        random: '決定性RNG',
        transform: '変形（transpose, stretch, quantize）',
        curves: 'カーブ/補間',
        theory: '基礎理論（スケール/トライアド）',
        drums: '抽象ドラムキーとパターン',
        vocal: '歌詞生成とアンダーレイ',
        analysis: '解析ユーティリティ（任意）',
      },
      viewDocs: 'ドキュメントを見る',
    },
    // Pipeline
    pipeline: {
      title: '実装パイプライン',
      steps: {
        parse: '.mfをASTへ',
        typecheck: 'import解決と型検査',
        evaluate: 'main()を評価してScore生成',
        normalize: 'bar:beatを絶対Posへ',
        emit: 'IR v4のscore.jsonを出力',
        render: 'Profile + Pluginで成果物生成',
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
    // Playground
    playground: {
      title: 'Playground',
      description: 'ブラウザでTakoMusicを試せます。コードを書いて生成されるIRを確認しましょう。',
      compile: 'コンパイル',
      compiling: 'コンパイル中...',
      clickCompile: '「コンパイル」をクリックして出力を確認',
      note: '注意: これはデモPlaygroundです。全機能を使うにはTakoMusicをローカルにインストールしてください。',
    },
  },
  en: {
    // Navigation
    nav: {
      home: 'Home',
      features: 'Features',
      example: 'Example',
      playground: 'Playground',
      docs: 'Docs',
      github: 'GitHub',
    },
    // Hero
    hero: {
      title: 'Music as Code',
      subtitle: 'A backend-agnostic DSL that evaluates to neutral IR.',
      subtitleLine2: 'Render Profiles + Plugins for MIDI/MusicXML/DAW.',
      seeExample: 'See Example',
      version: 'v4.0.0',
      license: 'AGPL-3.0',
      copied: 'Copied',
    },
    // Features
    features: {
      title: 'Everything you need to compose',
      simpleSyntax: {
        title: 'Simple Syntax',
        description: 'Write `.mf` with score/clip DSL and Dur literals (q, 1/4)',
      },
      multiFormat: {
        title: 'Multi-Format Export',
        description: 'Renderer plugins output MIDI/MusicXML/DAW formats with profiles for binding',
      },
      stdlib: {
        title: 'Rich Standard Library',
        description: 'std:* modules for clip composition, transforms, and vocal alignment',
      },
      vscodeExtension: {
        title: 'VSCode Extension',
        description: 'Syntax highlighting, snippets, and real-time error checking for a smooth dev experience',
      },
      staticAnalysis: {
        title: 'Static Analysis',
        description: 'Catch undefined sounds, role mismatches, and invalid durations before rendering',
      },
      cliTools: {
        title: 'Implementation Pipeline',
        description: 'Designed around parse → typecheck → normalize → render',
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
      description: '9 modules (analysis optional) for backend-agnostic composition.',
      modules: {
        core: 'Clip composition and Score/Track helpers',
        time: 'Time utilities (bar:beat, Dur)',
        random: 'Deterministic RNG',
        transform: 'Transforms (transpose, stretch, quantize)',
        curves: 'Curves and interpolation',
        theory: 'Basic theory (scales/triads)',
        drums: 'Abstract drum keys and patterns',
        vocal: 'Lyric creation and underlay',
        analysis: 'Analysis utilities (optional)',
      },
      viewDocs: 'View Documentation',
    },
    // Pipeline
    pipeline: {
      title: 'Implementation Pipeline',
      steps: {
        parse: 'Parse .mf into AST',
        typecheck: 'Resolve imports and typecheck',
        evaluate: 'Evaluate main() into Score',
        normalize: 'Normalize bar:beat into Pos',
        emit: 'Emit IR v4 score.json',
        render: 'Render artifacts via profile + plugin',
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
    // Playground
    playground: {
      title: 'Playground',
      description: 'Try TakoMusic in your browser. Write code and see the generated IR.',
      compile: 'Compile',
      compiling: 'Compiling...',
      clickCompile: 'Click "Compile" to see the output',
      note: 'Note: This is a demo playground. For full functionality, install TakoMusic locally.',
    },
  },
} as const

export type Language = keyof typeof translations
export type TranslationKeys = typeof translations['en']
