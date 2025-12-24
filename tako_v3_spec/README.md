# Tako v3 Implementation Docs (確定版)

このフォルダは、Tako v3 を実装するための「規範ドキュメント一式」です。
言語仕様・中立IR(JSON)・Render Profile(JSON)・Renderer Plugin契約・標準ライブラリAPI・サンプルを含みます。

## 収録物

- `LANGUAGE_V3.md`
  - 字句/構文/型/評価モデル/score・clip DSL の仕様（実装者向け）
- `IR_V3.schema.json`
  - `Score` 中立IRの JSON Schema（規範）
- `PROFILE_V3.schema.json`
  - Render Profile の JSON Schema（規範）
- `PLUGIN_V3.md`
  - Renderer Plugin（MIDI/MusicXML/DAW/ボーカル合成等）の契約仕様（規範）
- `STDLIB_V3.md`
  - `std:*` のモジュール一覧と API 仕様（規範）
- `examples/`
  - `.mf` サンプルと、Profileサンプル（MIDI/ボーカル等）

## 実装パイプライン（推奨）

1. **Parse**: `.mf` → AST
2. **Resolve/Typecheck**: import 解決・型検査（少なくとも Pos/Dur の分離）
3. **Evaluate**: `export fn main() -> Score` を評価し、`Score` 値を得る（決定性）
4. **Normalize IR**:
   - `Placement.at` を絶対 `Pos`(Rat) に解決（bar:beat を除去）
   - `Clip.events` を start順に安定ソート（推奨）
5. **Emit IR JSON**: `IR_V3.schema.json` に適合する `score.json` を生成（テスト基盤）
6. **Render**:
   - Profile(JSON)を読み込み
   - Renderer Plugin へ `validate` → `render` の順に呼び出し
   - Artifacts（MIDI/MusicXML/DAW project 等）を出力

## バージョン
- Tako Language: v3
- IR schema: `tako.irVersion = 3`
- Profile schema: `tako.profileVersion = 1`
- Plugin protocol: `tako.pluginProtocolVersion = 1`
