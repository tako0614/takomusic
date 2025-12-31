# TakoMusic v4 実装状況

このドキュメントは、[docs/V4_SPEC.md](V4_SPEC.md) / [docs/V4_RATIONALE.md](V4_RATIONALE.md) に書かれている v4 要素について、現行実装（`src/` の compiler）の状況を棚卸ししたものです。

**最終更新: 2026-01-01**

## ドキュメントの所在

- 設計根拠/優先度: [docs/V4_RATIONALE.md](V4_RATIONALE.md)
- 仕様ドラフト/ロードマップ: [docs/V4_SPEC.md](V4_SPEC.md)

---

## ✅ 実装済み

以下は Lexer/Parser/Typecheck/Evaluator で動作確認済み。

| 機能 | 構文例 | 備考 |
|------|--------|------|
| テンプレートリテラル | `"Hello ${name}"` | 文字列内のみ |
| パイプライン演算子 | `x |> f` | |
| スプレッド演算子 | `[...arr]`, `{...obj}` | |
| Nullish coalescing | `a ?? b` | |
| タプル分解 | `const (a, b, ...rest) = expr` | |
| match 式 | `match (x) { ... }` | リテラル/範囲/ガード条件対応 |
| enum | `enum Color { Red, Green, Blue }` | ペイロード付き含む |
| type alias | `type Velocity = Float;` | |
| 連符 | `triplet(n) { ... }`, `tuplet(n, inTime) { ... }` | |
| テンポ漸進 | `ramp()` / `ease()` 関数 | |
| アルペジオ | `arp(chord, dur, direction)` | |
| アナクルーシス | `meta { anacrusis q; }` | |

---

## ⚠️ 仕様と実装の不整合

| 項目 | V4_SPEC.md の記載 | 実装の実態 | 対応方針 |
|------|------------------|-----------|---------|
| triplet 構文 | `triplet { ... }` (引数なし) | `triplet(n)` または `triplet(n, inTime)` | 仕様を実装に合わせて更新 |
| humanize() 戻り値 | タプル `(Rng, Clip)` | 配列 `[rng, clip]` | v4.0では配列のまま、v4.1でタプル化検討 |
| divmod() | V4_SPECではタプル `(quotient, remainder)` を返す | LANGUAGE.mdでは配列で例示、stdlibにはない | ユーザー定義可能なので問題なし |
| match ガード条件 | `v if v < 0.3 -> ...` | ✅ 実装済み（AST/Parser/Evaluator/Formatter） | 完了 |
| 動的PosRef範囲 | `place 1:1..8:1 repeat(...)` | 未実装 | v4.1以降で検討 |

### ドキュメント記載漏れ

~~以下は実装済みだがドキュメントに記載がない~~ → **すべて追記済み**

| 機能 | 実装場所 | 追記先 | 状態 |
|------|---------|--------|------|
| `arp()` 構文 | `src/ast.ts:479-485` | BUILTINS.md | ✅ 追記済み |
| `triplet()/tuplet()` 詳細 | `src/ast.ts:493-498` | BUILTINS.md | ✅ 追記済み |
| テンポ漸進 `ramp()/ease()` | `src/evaluator.ts` | STDLIB.md (std:curves) | 既存 |

---

## ❌ 未実装（V4_SPEC.md に記載あり）

### 言語機能

| 機能 | 構文例 | 実装難易度 | 優先度 |
|------|--------|-----------|--------|
| `struct` 宣言 | `struct Point { x: Int, y: Int }` | 中 | 低 |
| `macro!` システム | `debug!(expr)` | 高 | 低 |
| Result 型 + `?` 演算子 | `const x = mayFail()?;` | 中 | 中 |
| `try-catch` 式 | `try { ... } catch (e) { ... }` | 中 | 中 |
| 動的 PosRef | `${bar}:${beat}` (文字列外) | 低 | 中 |
| ジェネリクス推論 | `fn map<T, U>(arr: [T], f: (T) -> U) -> [U]` | 高 | 低 |
| `tako migrate` | CLI移行ツール | 中 | 低 |

### 標準ライブラリ

| モジュール | 関数 | 状態 |
|-----------|------|------|
| std:core | `map()`, `filter()`, `fold()`, `flatMap()` | ✅ 実装済み |
| std:core | `zip()`, `enumerate()`, `range()`, `find()`, `findIndex()`, `every()`, `some()`, `includes()`, `take()`, `drop()` | ✅ 実装済み |
| std:core | `merge(clips)`, `split()`, `reverse()`, `invert()`, `retrograde()`, `augment()`, `diminish()` | ✅ 実装済み |
| std:theory | `analyze()`, `voiceLead()`, `commonTones()`, `degreeToChord()`, `modulate()` | ✅ 実装済み |
| std:theory | `add2()`, `add4()`, `six()`, `sixNine()`, `minorSix()`, `sharpFive()`, `flatFive()`, `sharpNine()`, `flatNine()` | ✅ 実装済み |
| std:rhythm | `euclidean()`, `euclideanClip()`, `polyrhythm()`, `crossRhythm()`, `groove()`, `applyGroove()`, `clave()`, `accent()` | ✅ 実装済み |
| std:midi | モジュール全体 | 未実装（v4.1以降） |
| std:audio | モジュール全体 | 未実装（v4.1以降） |

### テスト/デバッグ機能

| 機能 | 構文例 | 状態 |
|------|--------|------|
| テスト属性 | `#[test] fn test_foo() { ... }` | 未実装 |
| デバッグ属性 | `#[breakpoint]`, `#[watch(expr)]` | 未実装 |
| ライブコーディング | `#[live]`, `#[live_param(...)]` | 未実装 |

---

## IR / スキーマ

| 項目 | 状態 |
|------|------|
| IR バージョン | `irVersion: 4` ✅ |
| IR_V4.schema.json | 実装済み ✅ |
| PROFILE_V3.schema.json | v3のまま（互換性のため維持） |
| スキーマ検証 | CLI で自動検証 ✅ |

---

## v4.0 リリース前チェックリスト

- [x] クラス名を V4* に統一（V4Lexer, V4Parser, V4Compiler, V4Evaluator）
- [x] CLI ヘルプを v4 に更新
- [x] package.json version を 4.0.0 に更新
- [x] 標準ライブラリコメントを v4 に更新
- [x] CHANGELOG.md に v4.0 の変更点を記載
- [x] vscode-extension のバージョンを同期 (4.0.0)
- [x] examples/*.mf, domo/*.mf のv3参照を削除
- [x] docs/BUILTINS.md, STDLIB.md, RENDERING.md のv3参照を削除
- [x] triplet/tuplet 構文を BUILTINS.md に追記
- [x] arp() 構文を BUILTINS.md に追記
- [x] match ガード条件を実装（AST/Parser/Evaluator/Formatter）
- [x] std:core に汎用配列関数を追加（map, filter, fold, etc.）
- [x] std:core にClip操作関数を追加（merge, reverse, invert, etc.）
- [x] std:rhythm モジュールを実装（euclidean, clave, etc.）
- [x] std:theory に拡張関数を追加（analyze, voiceLead, etc.）
- [x] virtualFs.ts をlib/*.mfと同期（ブラウザ対応）
- [x] テストを追加（212テスト、stdlib含む）
- [x] Web Playground 実装確認（リアルコンパイル対応済み）
- [x] LSP 実装確認（定義ジャンプ、参照、シグネチャヘルプ対応済み）
- [x] V4_SPEC.md のロードマップチェックボックスを更新

---

## 次のステップ（推奨順）

1. ~~**即時対応**: triplet 構文の仕様書更新~~ → ✅ 完了
2. ~~**v4.0 リリース**: 主要機能はすべて実装済み。テスト完了後リリース可能~~ → ✅ **リリース準備完了**
   - 212テスト全てパス
   - Web Playground リアルコンパイル対応
   - LSP 定義ジャンプ・参照・シグネチャヘルプ対応
   - CHANGELOG.md 更新済み
3. **v4.1 以降**: struct, Result型, 動的PosRef, std:midi, std:audio などの追加機能

