# TakoMusic エコシステム分析レポート

本ドキュメントは、TakoMusic v3 の作曲プラットフォームとしての完成度とエコシステムの課題を詳細に分析したものです。

---

## 目次

1. [現状の強み](#現状の強み)
2. [エコシステムの課題](#エコシステムの課題)
   - [重要度: 高](#重要度-高)
   - [重要度: 中](#重要度-中)
   - [重要度: 低](#重要度-低)
3. [各分野の詳細分析](#各分野の詳細分析)
4. [改善ロードマップ案](#改善ロードマップ案)

---

## 現状の強み

### 言語設計
- **バックエンド非依存**: Score IR を中間表現として出力し、レンダラープラグインで多様な出力形式に対応
- **有理数ベース時間モデル**: Rat 型による正確な拍・小節表現（量子化アーティファクトなし）
- **Pos/Dur 型分離**: 位置と長さを型レベルで区別し、ミスを防止
- **決定論的評価**: 同じソースから常に同じ IR を生成

### ドキュメント
| ファイル | 状態 | 内容 |
|---------|------|------|
| `LANGUAGE.md` | 完成 | v3 言語仕様（22KB） |
| `BUILTINS.md` | 完成 | score/clip DSL 詳細（12KB） |
| `STDLIB.md` | 完成 | 標準ライブラリ全関数（31KB） |
| `RENDERING.md` | 完成 | レンダラープロトコル（11KB） |
| `SCHEMAS.md` | 完成 | JSON Schema リファレンス |
| JSON Schemas | 完成 | IR_V3, PROFILE_V3 |

### 標準ライブラリ（8モジュール、約1,442行）
- `std:core` - クリップ合成（concat, overlay, repeat, slice 等）
- `std:vocal` - ボーカル処理（歌詞、ビブラート、ブレス）
- `std:transform` - 変形（transpose, stretch, invert）
- `std:drums` - ドラムパターン生成
- `std:curves` - オートメーションカーブ
- `std:time` - 時間ユーティリティ
- `std:random` - シード付き乱数
- `std:theory` - 音楽理論（コード、スケール）

### ツールチェイン
- CLI: `mf init`, `mf check`, `mf build`, `mf render`
- VSCode 拡張: シンタックスハイライト、スニペット（12種類以上）
- Web サイト: https://music.takos.jp（日英対応）

---

## エコシステムの課題

### 重要度: 高

#### 1. テストカバレッジの不足

**現状**:
- テストファイルは `src/__tests__/v3.compiler.test.ts` の 1 ファイルのみ
- 統合テスト 6 ケース + stdlib レジストリテスト 1 ケース
- Parser、Evaluator、TypeChecker の個別ユニットテストなし

**テスト対象**:
```
✓ 最小スコアのコンパイル
✓ stdlib インポート解決
✓ スコアマーカー
✓ ボーカルビブラートオートメーション
✓ match 式
✓ Pos/Dur 型不一致エラー
```

**欠けているテスト**:
- Lexer のトークン化テスト
- Parser の AST 生成テスト（境界ケース、エラーケース）
- TypeChecker の型推論・型エラーテスト
- Evaluator の各演算子・組み込み関数テスト
- Normalizer のテスト
- スナップショット/ゴールデンテスト

**影響**: リファクタリング時のリグレッションリスク、バグ検出の遅れ

---

#### 2. レンダラープラグインの不足

**現状**:
- プロファイル定義は 3 つのみ
  - `audio.mf.profile.json` - audio.simple レンダラー
  - `full.mf.profile.json`
  - `neutrino.mf.profile.json` - NEUTRINO 用

**問題点**:
- 実際のレンダラー実装（プラグインバイナリ）が公開されていない
- MIDI 出力、MusicXML 出力のリファレンス実装なし
- プラグイン開発ガイド/テンプレートなし

**プロファイル例（audio.mf.profile.json）**:
```json
{
  "tako": { "profileVersion": 1 },
  "profileName": "neon_edge_audio",
  "renderer": "audio.simple",
  "output": {
    "path": "out/neon_edge_backing.mp3",
    "sampleRate": 44100
  },
  "bindings": [
    { "selector": { "sound": "pad" }, "config": { "preset": "pad" } }
  ]
}
```

**必要なもの**:
- `tako-renderer-midi`: MIDI ファイル出力
- `tako-renderer-audio`: 基本的なオーディオ合成
- プラグイン開発テンプレート（Rust/Go/Node.js）
- プラグインの npm/crates.io での配布

---

#### 3. LSP / IDE 支援の欠如

**現状（VSCode 拡張）**:
```json
{
  "contributes": {
    "languages": [{ "id": "takomusic", "extensions": [".mf"] }],
    "grammars": [{ "language": "takomusic", "path": "./syntaxes/takomusic.tmLanguage.json" }],
    "snippets": [{ "language": "takomusic", "path": "./snippets/takomusic.json" }]
  }
}
```

**提供されている機能**:
- シンタックスハイライト（TextMate 文法）
- スニペット（score, clip, fn, sound 等）

**欠けている機能**:
| 機能 | 現状 | 優先度 |
|-----|------|--------|
| リアルタイムエラー表示 | なし | 高 |
| コード補完 | なし | 高 |
| ホバー情報（型、ドキュメント） | なし | 中 |
| 定義ジャンプ | なし | 中 |
| 参照検索 | なし | 低 |
| リネーム | なし | 低 |
| フォーマッタ | なし | 中 |

**実装アプローチ**:
- VSCode 拡張に Language Server Protocol (LSP) サーバーを統合
- `src/compiler.ts` の `check()` メソッドを LSP の `textDocument/diagnostic` に接続
- 型情報を `textDocument/hover` で表示

---

### 重要度: 中

#### 4. Web プレイグラウンドの制限

**現状**:
- Monaco Editor ベースのプレイグラウンドが存在（`website/src/components/Playground.tsx`）
- シンタックスハイライト対応
- 4 つのサンプルスニペット

**問題点**:
```typescript
// Playground.tsx:323-338
const compile = async () => {
  // Simulate compilation (in real implementation, this would call the Tako compiler)
  await new Promise(resolve => setTimeout(resolve, 500))
  const mockIR = generateMockIR(code())  // モック出力のみ
  setOutput(JSON.stringify(mockIR, null, 2))
}
```
- **実際のコンパイラを呼び出していない**（モック IR のみ）
- エラーメッセージが表示されない
- 構文エラーのフィードバックなし

**改善案**:
- WebAssembly 版コンパイラ（`@anthropic/takomusic-wasm`）の開発
- または API サーバー経由でのコンパイル

---

#### 5. パッケージマネージャー / 依存管理の欠如

**現状**:
- `import { repeat } from "std:core"` でビルトインのみ使用可能
- ユーザー定義ライブラリの配布・インストール機構なし

**他言語との比較**:
| 言語 | パッケージマネージャー |
|-----|----------------------|
| Rust | Cargo + crates.io |
| Node.js | npm + npmjs.com |
| Python | pip + PyPI |
| **TakoMusic** | なし |

**必要な要素**:
- パッケージ定義形式（`mfconfig.toml` の拡張）
- パッケージレジストリ（`registry.takos.jp`）
- `mf install <package>` コマンド
- バージョン解決・ロックファイル

---

#### 6. サンプル・チュートリアルの不足

**現状**:
- `examples/` に 5 ファイル
  - `simple_melody.mf` (57行)
  - `full_song.mf` (57行)
  - `euclidean_drums.mf` (17行)
  - `jazz_progression.mf` (20行)
  - `generative.mf` (20行)

**欠けているもの**:
- 段階的なチュートリアル（Getting Started ガイド）
- ユースケース別サンプル
  - ボーカロイド楽曲
  - オーケストラアレンジ
  - EDM トラック
- ベストプラクティスガイド
- FAQ

---

#### 7. エラーメッセージの品質

**現状の診断システム**:
```typescript
// src/diagnostics.ts
export interface Diagnostic {
  severity: DiagnosticSeverity;  // 'error' | 'warning'
  message: string;
  position?: Position;           // { line, column }
  filePath?: string;
}

export function formatDiagnostic(diag: Diagnostic): string {
  const loc = diag.position
    ? `${diag.filePath ?? 'unknown'}:${diag.position.line}:${diag.position.column}`
    : diag.filePath ?? '';
  const prefix = diag.severity === 'error' ? 'error' : 'warning';
  return loc ? `${prefix}: ${diag.message}\n  --> ${loc}` : `${prefix}: ${diag.message}`;
}
```

**改善点**:
| 項目 | 現状 | 改善案 |
|-----|------|--------|
| ソースコード抜粋 | なし | エラー箇所のコード表示 |
| 修正提案 | なし | "Did you mean...?" |
| エラーコード | なし | `E0001` 形式の番号付け |
| 関連情報 | なし | "Note: xxx was defined here" |
| カラー出力 | なし | ANSI カラーでハイライト |

**理想的なエラー出力例**:
```
error[E0042]: Expected duration, found position
  --> src/main.mf:15:14
   |
15 |       rest(1:1);
   |            ^^^ position value `1:1` used where duration expected
   |
   = help: use a duration like `q` (quarter) or `h` (half) instead
   = note: positions use the format `bar:beat`, durations use `q`, `h`, `w`, etc.
```

---

### 重要度: 低

#### 8. CHANGELOG の不備

**現状**:
```markdown
# Changelog

## [Unreleased]
- ...
```
- 過去のリリースバージョンの履歴なし
- v3.0.0、v3.1.0 等の変更内容が未記載

---

#### 9. CI/CD パイプラインの可視性

**現状**: GitHub Actions の設定有無が不明

**推奨設定**:
- プルリクエスト時の自動テスト
- リリース時の npm パッケージ公開
- ドキュメントサイトの自動デプロイ

---

## 各分野の詳細分析

### コンパイラアーキテクチャ

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Lexer     │ → │   Parser    │ → │ TypeChecker │
│ (lexer.ts)  │   │(parser.ts)  │   │(typecheck.ts)│
└─────────────┘   └─────────────┘   └─────────────┘
                                          ↓
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Emit      │ ← │ Normalize   │ ← │  Evaluator  │
│ (score.json)│   │(normalize.ts)│  │(evaluator.ts)│
└─────────────┘   └─────────────┘   └─────────────┘
```

**ファイルサイズ**:
- `parser.ts`: 990 行
- `typecheck.ts`: 971 行
- `evaluator.ts`: 1,519 行
- `compiler.ts`: 214 行

### レンダラープロトコル

```
Host                          Plugin
  │                             │
  │  capabilities               │
  │────────────────────────────>│
  │         { protocolVersion: 1, id: "...", ... }
  │<────────────────────────────│
  │                             │
  │  validate --score --profile │
  │────────────────────────────>│
  │         [{ level, message, location }]
  │<────────────────────────────│
  │                             │
  │  render --score --profile   │
  │────────────────────────────>│
  │         [{ kind: "file", path: "..." }]
  │<────────────────────────────│
```

---

## 改善ロードマップ案

### Phase 1: 基盤強化
1. **テストカバレッジ拡充**
   - Parser ユニットテスト追加
   - Evaluator ユニットテスト追加
   - スナップショットテスト導入
   - カバレッジ目標: 80%

2. **エラーメッセージ改善**
   - ソースコード抜粋表示
   - エラーコード体系
   - ANSI カラー出力

### Phase 2: 開発者体験
3. **LSP サーバー実装**
   - リアルタイム診断
   - コード補完
   - ホバー情報

4. **Web プレイグラウンド実コンパイル**
   - WASM コンパイラまたは API

### Phase 3: エコシステム拡大
5. **リファレンスレンダラー**
   - `tako-renderer-midi`
   - `tako-renderer-basic-audio`

6. **パッケージマネージャー**
   - `mf install` コマンド
   - パッケージレジストリ

### Phase 4: コミュニティ
7. **チュートリアル・サンプル拡充**
8. **プラグイン開発ガイド**
9. **コントリビューションガイド**

---

## まとめ

TakoMusic v3 は**言語設計・仕様・ドキュメントは非常に高品質**です。しかし、プラットフォームとして成熟するためには以下が必要です：

| カテゴリ | 現状 | 目標 |
|---------|------|------|
| テスト | 1 ファイル | 80%+ カバレッジ |
| レンダラー | プロファイルのみ | リファレンス実装 |
| IDE 支援 | ハイライトのみ | フル LSP |
| プレイグラウンド | モック | 実コンパイル |
| パッケージ管理 | なし | レジストリ |

**推奨される次のアクション**: テストカバレッジ拡充 → LSP 実装 → リファレンスレンダラー開発
