# Tako v3 実装計画

本書は v3 実装のロードマップ。規範仕様は `tako_v3_spec/` を唯一の仕様ソースとする。
実装は段階的に進め、CLI/ツールは後追いで整備する。

## 0. 目的

- `.mf` ソースを v3 仕様で評価し、中立IR `Score` を生成する
- Render Profile + Renderer Plugin により、出力形式をバックエンド分離する
- 決定性を保証（同一入力 → 同一 Score）

## 1. 非目的（v3 MVP）

- 具体的なDAWや合成エンジンへの最適化
- GUI/エディタ連携（LSPなどは後回し）

## 2. 仕様ソース（参照）

- `tako_v3_spec/LANGUAGE_V3.md`
- `tako_v3_spec/IR_V3.schema.json`
- `tako_v3_spec/PROFILE_V3.schema.json`
- `tako_v3_spec/PLUGIN_V3.md`
- `tako_v3_spec/STDLIB_V3.md`

## 3. ファイル規約

- ソース: `*.mf`
- Render Profile: `*.mf.profile.json`
- IR dump: `*.mf.score.json`

バージョン:
- `tako.irVersion = 3`
- `tako.profileVersion = 1`
- `tako.pluginProtocolVersion = 1`

## 4. 実装パイプライン（v3）

1. Parse `.mf` → AST
2. Resolve/Typecheck（import 解決、Pos/Dur 分離）
3. Evaluate `export fn main() -> Score`
4. Normalize（bar:beat → Pos、イベント順序）
5. Emit `score.json`（IR v3）
6. Render（Profile + Plugin）

## 5. マイルストーン

### M1: Frontend（Lexer/Parser/AST）
- 予約語・リテラル（Rat/Dur/PosRef/Pitch）
- `score`/`clip` 構文のAST生成
- 最小の構文エラー診断

### M2: 名前解決 / 型検査
- import 解決（std + ローカル）
- Pos/Dur の型分離
- 最小診断（未定義SoundId/負のdur等）

### M3: 評価器
- 純粋評価で `Score` 値を生成
- `clip` カーソルとイベント生成
- std:core/time/random の最小実装

### M4: IR 正規化 + JSON 出力
- PosRef の解決（meterMapでbar:beat → Pos）
- `Clip.events` の安定ソート
- JSON Schema 適合のスナップショット生成

### M5: Renderer Plugin Host
- CLI plugin 実行（capabilities/validate/render）
- Profile binding 解決
- degradePolicy による挙動

### M6: CLI（最小）
- `check` / `build` / `render` の最小コマンド
- 入力 `.mf` と Profile 指定
- 出力先の指定（score.json / artifacts）

### M7: ツール整備（任意）
- formatter
- LSP/VSCode 拡張

## 6. 版選択（未決事項）

`.mf` 拡張子は将来のバージョンでも共有される可能性があるため、言語バージョンは明示的に選択する。

候補:
- CLI フラグ（例: `--lang v3`）
- プロジェクト設定ファイルで `languageVersion = 3`
- 自動判定は MVP では行わない

## 7. テスト方針

- parser/evaluator のゴールデンテスト
- `IR_V3.schema.json` での検証
- Renderer Plugin のモックテスト

## 8. ドキュメント

- README/website/docs を v3 に合わせて更新
- 仕様変更は `tako_v3_spec/` を正とする
