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
| `std:ai` | Gemini統合フック |

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
compose (短): 5 クレジット
compose (長): 25 クレジット
analyze: 5 クレジット
explain: 3 クレジット
convert (自然言語→コード): 8 クレジット
suggest (インライン): 1 クレジット
```

### 2.5 APIエンドポイント

```
POST /api/auth/login          # OAuth
GET  /api/projects            # プロジェクト一覧
POST /api/projects            # 作成
POST /api/ai/compose          # AI作曲
POST /api/ai/explain          # AI説明
POST /api/exports             # エクスポート要求
```

---

## Part 3: VSCode拡張

### 3.1 LSP機能強化

- **コードアクション**: 不足インポート追加、型エラー修正
- **フォーマット**: 既存の`V4Formatter`統合
- **セマンティックトークン**: ピッチ/デュレーション/ポジションハイライト
- **シンボルリネーム**: ファイル横断の安全なリファクタリング

### 3.2 拡張機能

- **プレビューパネル**: Web Audioによる再生
- **MIDI出力**: node-midiによる直接出力
- **プロジェクトエクスプローラー**: .mfファイルのツリービュー
- **クラウド同期**: Webプラットフォームとのログイン・同期

### 3.3 AI機能 (Gemini)

```typescript
// インラインサジェスト (Copilot風)
TakoMusicInlineCompletionProvider

// コマンド
takomusic.aiExplain   // 選択コード説明
takomusic.aiGenerate  // 自然言語から生成
takomusic.aiChat      // チャットパネル
```

---

## Part 4: 実装フェーズ

### Phase 1: v6基盤 (4-6週間) ✅ 開始済み
1. ✅ `std:harmony` モジュール
2. ✅ `std:melody` モジュール
3. ⬜ `std:markov`, `std:structure`, `std:constraint` モジュール
4. ⬜ `std:autogen` モジュール
5. ⬜ エラーメッセージ強化
6. ⬜ 基本Webプラットフォーム (認証, プロジェクト保存)

### Phase 2: 分析・生成 (4-6週間)
1. オーディオ再生 (Web Audio + Tone.js)
2. エクスポート改善 (MIDIダウンロード)
3. LSPコードアクション・フォーマット

### Phase 3: AI統合 (4-6週間)
1. `std:ai` モジュール + Geminiフック
2. Webプラットフォーム AI機能
3. VSCodeインラインサジェスト
4. AIチャットパネル
5. クレジットシステム

### Phase 4: プレミアム機能 (4-6週間)
1. オーディオエクスポート (サーバーサイド合成)
2. リアルタイムコラボレーション (WebSocket + yjs)
3. Stripeサブスクリプション統合
4. VSCodeクラウド同期

### Phase 5: ポリッシュ (2-4週間)
1. パフォーマンス最適化
2. ドキュメント・チュートリアル
3. テストカバレッジ
4. マーケットプレイス公開

---

## 重要ファイル

### 言語コア
- `src/ast.ts` - マクロ、制約、トレイトのASTノード追加
- `src/typecheck.ts` - エフェクト、トレイト、依存型
- `src/evaluator.ts` - 新構文の評価
- `src/errors.ts` - リッチなエラーフォーマット

### 標準ライブラリ
- `lib/harmony.mf` - 和声分析 ✅
- `lib/melody.mf` - 旋律分析 ✅
- `lib/markov.mf` - 統計モデル
- `lib/structure.mf` - 構造分析
- `lib/constraint.mf` - 制約ソルバー
- `lib/autogen.mf` - 自動生成
- `lib/ai.mf` - Gemini統合

### Webプラットフォーム
- `website/src/components/Editor/` - 強化エディタ
- `website/src/stores/` - 状態管理
- `api/routes/` - バックエンドエンドポイント
- `api/services/gemini.ts` - AIラッパー

### VSCode拡張
- `vscode-extension/src/extension.ts` - エントリーポイント
- `src/lsp/server.ts` - LSP強化
- `vscode-extension/src/ai/` - Gemini統合
- `vscode-extension/src/playbackPanel.ts` - 再生プレビュー

---

## 検証方法

1. **言語**: `npm run test` - 全テストパス
2. **Webプラットフォーム**: プロジェクト作成、保存、MIDI出力を手動テスト
3. **AI機能**: compose/explainをサンプルプロンプトでテスト
4. **VSCode**: 拡張読み込み、LSP動作、再生機能を確認
5. **サブスクリプション**: Stripe webhookテストモード

---

*Last updated: 2026-01-16*
*Current version: v6.0.0*
*Target version: v7.0.0*
