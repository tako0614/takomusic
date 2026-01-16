# TakoMusic v7.0 Roadmap

> 作曲プラットフォーム + AI統合の完全版

## Overview

**Goal**: "完璧な理想の作曲言語" + Web作曲プラットフォーム + Gemini AI統合

**Target**:
- プラットフォーム: Web + VSCode拡張
- 課金: Freemium
- ユーザー: 初心者からプロまで全層

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
Backend:   Cloudflare Workers / Node.js + PostgreSQL
Storage:   Cloudflare R2 / S3
Auth:      Supabase Auth / Clerk
Payments:  Stripe
AI:        Gemini API (gemini-2.0-flash)
```

### 2.2 データベーススキーマ

```sql
users (id, email, name, provider, created_at)
subscriptions (user_id, tier, stripe_id, ai_credits_remaining)
projects (id, user_id, title, source_code, compiled_ir, is_public)
ai_conversations (id, user_id, project_id, messages, tokens_used)
exports (id, project_id, format, file_url, status)
```

### 2.3 料金プラン

| 機能 | Free | Premium ($9.99/月) | Team ($29.99/月) |
|------|------|-------------------|------------------|
| プロジェクト数 | 5 | 無制限 | 無制限 |
| MIDI出力 | 5/月 | 無制限 | 無制限 |
| オーディオ出力 | - | 50/月 | 無制限 |
| AIクレジット | 50/月 | 1,000/月 | 5,000/月 |
| コラボレーション | - | - | リアルタイム |

### 2.4 AIクレジットコスト

```
compose: 5 credits
explain: 3 credits
chat: 1 credit
inline: 1 credit
agent: 8 credits
```

### 2.5 APIエンドポイント

```
POST /api/auth/login          # OAuth
GET  /api/projects            # projects list
POST /api/projects            # create
POST /api/ai/compose          # AI compose
POST /api/ai/explain          # AI explain
POST /api/ai/chat             # AI chat
POST /api/ai/inline           # AI inline
POST /api/ai/agent            # AI agent
POST /api/exports             # export request
```

---

## Part 3: VSCode拡張

### 3.1 LSP Features

- **Code actions**: missing import fixes, type error hints
- **Formatting**: integrate existing `V4Formatter`
- **Semantic tokens**: pitch/duration/position highlight
- **Rename symbols**: safe refactoring across files

### 3.2 Extension Scope

- **LSP only**: type inference, diagnostics, formatting, code actions
- **AI/playback/sync**: handled in the Web app

---

## Part 4: 実装フェーズ

### Phase 1: v6基盤 (4-6週間) [x] 完了
1. [x] `std:harmony` モジュール
2. [x] `std:melody` モジュール
3. [x] `std:markov` モジュール
4. [x] `std:structure` モジュール
5. [x] `std:constraint` モジュール
6. [x] `std:autogen` モジュール
7. [x] エラーメッセージ強化
8. [x] 基本Webプラットフォーム (認証, プロジェクト保存)

### Phase 2: 分析・生成 (4-6週間) [x] 完了
1. [x] オーディオ再生 (Web Audio + Tone.js)
2. [x] エクスポート改善 (MIDIダウンロード)
3. [x] LSPコードアクション・フォーマット

### Phase 3: AI統合 (4-6週間) [x] 完了
1. [x] Gemini hook (host/API)
2. Web platform: basic auth, project create/save/load, playback, MIDI download, collab connect test
3. [x] Web AI panel (compose/explain/chat)
4. [x] Web inline/agent
5. [x] Credit system
### Phase 4: プレミアム機能 (4-6週間) [x] 完了
1. [x] オーディオエクスポート (サーバーサイド合成)
2. [x] リアルタイムコラボレーション (WebSocket + yjs)
3. [x] Stripeサブスクリプション統合

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
- `website/src/stores/projects.ts` - プロジェクト保存
- `website/src/lib/audioPlayer.ts` - 再生ロジック
- `website/src/lib/midiExport.ts` - MIDIダウンロード [x]
- `website/src/lib/compiler.ts` - コンパイル連携
- `website/src/lib/aiClient.ts` - AIクライアント [x]
- `website/src/stores/credits.ts` - クレジット管理 [x]
- `api/routes/` - バックエンドエンドポイント [x]
- `api/routes/ai.ts` - AIルート [x]
- `api/routes/exports.ts` - オーディオエクスポート [x]
- `api/routes/billing.ts` - Stripe統合 [x]
- `api/routes/sync.ts` - クラウド同期 [x]
- `api/index.ts` - APIハンドラ [x]
- `api/services/gemini.ts` - AIラッパー [x]
- `api/services/credits.ts` - クレジット管理 [x]
- `api/services/audioExport.ts` - サーバーサイド合成 [x]
- `api/services/stripe.ts` - Stripe統合 [x]
- `api/services/cloudSync.ts` - クラウド同期 [x]
- `api/collabServer.ts` - コラボレーションサーバー [x]

### Docs
- `docs/TUTORIAL_V7.md` - V7 tutorial [x]

### VSCode拡張
- `vscode-extension/src/extension.ts` - エントリーポイント
- `vscode-extension/README.md` - Marketplace README [x]
- `vscode-extension/CHANGELOG.md` - Marketplace changelog [x]
- `vscode-extension/src/server.ts` - LSPクライアント起動
- `src/lsp/server.ts` - LSPサーバ
- `vscode-extension/src/ai/` - Gemini統合 [x]
- `vscode-extension/src/ai/client.ts` - AIクライアント [x]
- `vscode-extension/src/ai/chatPanel.ts` - AIチャットパネル [x]
- `vscode-extension/src/playbackPanel.ts` - 再生プレビュー [x]
- `vscode-extension/src/sync/client.ts` - クラウド同期 [x]

---

## 検証方法

1. **言語**: `npm run test` - 全テストパス
2. **Webプラットフォーム**: 簡易認証、プロジェクト作成/保存/読み込み、再生、MIDIダウンロード、コラボレーション接続をテスト
3. **AI**: test compose/explain/chat/inline/agent with sample prompts
4. **VSCode**: load extension and verify LSP features
5. **サブスクリプション**: Stripe webhookテストモード

---

*Last updated: 2026-01-16*
*Current version: v6.0.0*
*Target version: v7.0.0*



