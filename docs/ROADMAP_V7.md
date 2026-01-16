# TakoMusic v7.0 Roadmap

> 作曲プラットフォームの完全版

## Overview

**Goal**: "完璧な理想の作曲言語" + Web作曲プラットフォーム

**Target**:
- Platform: Web + VSCode extension
- Billing: none
- Users: beginner to pro

---

## Part 1: 言語機能強化

### 1.1 新しい構文

```mf
// マクロシステム
macro pattern!(notes, dur) {
  clip { for (p in notes) { note(p, dur); } }
}

// リスト内包表記
const notes = [note(p, q) for p in scale if p > C4];

// 制約式
fn compose(pitches: [Pitch] where len >= 2) -> Clip { ... }

// パイプライン強化
melody |?> (mode == "jazz") swing(_, e, 0.5);

// パターンマッチング強化
if let { pitch, dur } = event { ... }
```

### 1.2 型システム拡張

```mf
// エフェクト型
fn generateMelody(seed: Int) -> Clip effects [Random] { ... }

// トレイト
trait Transposable {
  fn transpose(self, semitones: Int) -> Self;
}

// 単位型
type BPM = Float<tempo>;
type Cents = Float<pitch_offset>;

// 依存型 (lite)
type FixedClip(len: Dur) = Clip where length(_) == len;
```

### 1.3 新しい標準ライブラリ

| モジュール | 機能 |
|-----------|------|
| `std:harmony` | 和声分析、キー検出、機能和声 |
| `std:melody` | 旋律分析、輪郭、モチーフ検出 |
| `std:markov` | マルコフ連鎖、統計モデル |
| `std:structure` | 形式分析、セグメンテーション |
| `std:constraint` | CSPソルバー、対位法制約 |
| `std:autogen` | 自動生成 (対旋律、ベース、伴奏) |

### 1.4 開発者体験

- **リッチなエラーメッセージ**: ソースコード表示、"もしかして?" 提案
- **デバッガ**: ブレークポイント、ステップ実行、値検査
- **LSP強化**: コードアクション、セマンティックハイライト、リネーム

---

## Part 2: Webプラットフォーム

### 2.1 技術スタック

```
Frontend:  Solid.js + Monaco Editor + Tailwind CSS + Web Audio API
Backend:   none (browser-only)
Storage:   IndexedDB (client)
Auth:      Local username (optional)
```

### 2.2 データベーススキーマ

```sql
projects (id, user, name, code, updated_at)
settings (key, value)
```

### 2.3 Billing

No billing. All features are free.

### 2.4 Audio Export (Web)

- OfflineAudioContext render
- WAV download

---

## Part 3: VSCode Extension (Language Features)

### 3.1 LSP Features

- **Code actions**: missing import fixes, type error hints
- **Formatting**: integrate existing `V4Formatter`
- **Semantic tokens**: pitch/duration/position highlight
- **Rename symbols**: safe refactoring across files

### 3.2 Extension Scope

- **LSP only**: type inference, diagnostics, formatting, code actions
- **Playback**: handled in the Web app

---

## Part 4: 実装フェーズ

### Phase 1: v7基盤 (4-6週間) [x] 完了
1. [x] `std:harmony` モジュール
2. [x] `std:melody` モジュール
3. [x] `std:markov` モジュール
4. [x] `std:structure` モジュール
5. [x] `std:constraint` モジュール
6. [x] `std:autogen` モジュール
7. [x] エラーメッセージ強化
8. [x] 基本Webプラットフォーム (認証, プロジェクト保存)

### Phase 2: 分析・生成 (4-6週間) [x] 完了
1. [x] オーディオ再生 (Web Audio)
2. [x] エクスポート改善 (MIDIダウンロード)
3. [x] LSPコードアクション・フォーマット

### Phase 3: Platform integration (4-6 weeks) [x] Done
1. [x] Web platform: basic auth, project save/load, playback, MIDI/WAV download
2. [x] IndexedDB local storage

### Phase 4: プレミアム機能 (4-6週間) [x] 完了
1. [x] オーディオエクスポート (ブラウザ合成)

### Phase 5: ポリッシュ (2-4週間) [x] 完了
1. [x] パフォーマンス最適化
2. [x] ドキュメント・チュートリアル
3. [x] テストカバレッジ
4. [x] マーケットプレイス公開

---

## 重要ファイル

### 言語コア
- `src/ast.ts` - マクロ、制約、トレイトのASTノード追加
- `src/typecheck.ts` - エフェクト、トレイト、依存型
- `src/evaluator.ts` - 新構文の評価
- `src/errors.ts` - リッチなエラーフォーマット

### 標準ライブラリ
- `lib/harmony.mf` - 和声分析 [x]
- `lib/melody.mf` - 旋律分析 [x]
- `lib/markov.mf` - Markov chain helpers [x]
- `lib/algorithm.mf` - Markov chain実装の現住所
- `lib/structure.mf` - 構造分析 [x]
- `lib/constraint.mf` - 制約ソルバー [x]
- `lib/autogen.mf` - 自動生成 [x]

### Webプラットフォーム
- `website/src/components/Editor/` - 強化エディタ [x]
- `website/src/stores/` - 状態管理 [x]
- `website/src/stores/session.ts` - ローカル認証
- `website/src/stores/projects.ts` - IndexedDB project storage [x]
- `website/src/lib/audioPlayer.ts` - 再生ロジック
- `website/src/lib/midiExport.ts` - MIDIダウンロード [x]
- `website/src/lib/audioExport.ts` - WAVダウンロード [x]
- `website/src/lib/compiler.ts` - コンパイル連携

### Docs
- `docs/TUTORIAL_V7.md` - V7 tutorial [x]

### VSCode拡張
- `vscode-extension/src/extension.ts` - エントリーポイント
- `vscode-extension/README.md` - Marketplace README [x]
- `vscode-extension/CHANGELOG.md` - Marketplace changelog [x]
- `vscode-extension/src/server.ts` - LSPクライアント起動
- `src/lsp/server.ts` - LSPサーバ

---

## 検証方法

1. **Language**: `npm run test` - all tests pass
2. **Web**: sign-in, project save/load (IndexedDB), playback, MIDI/WAV download
3. **VSCode**: load extension, verify LSP features
---

*Last updated: 2026-01-16*
*Current version: v7.0.0*
*Target version: v7.0.0*






