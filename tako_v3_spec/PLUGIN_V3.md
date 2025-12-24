# Tako v3 Renderer Plugin Specification (Protocol v1 / 確定版)

この文書は、Tako v3 ホスト（コンパイラ/ランタイム）が Renderer Plugin を呼び出すための契約を規定する。
Renderer Plugin は **バックエンド依存**（MIDI/MusicXML/DAW/ボーカル合成等）の変換を担当し、Tako v3 の言語コア/標準ライブラリは plugin を直接参照しない。

## 1. 要件（MUST）
- Plugin は次の3操作を提供する:
  - `capabilities`
  - `validate`
  - `render`
- Host は `validate` を通過した `Score` のみを `render` へ渡すことを推奨する（SHOULD）。
- Plugin は決定的であるべき（同一入力に対し同一出力）（SHOULD）。ただし DAW 等で完全決定性が難しい場合は、少なくとも `validate` で差異要因を明示すること。

## 2. 形態
v3 の規範形態は **CLI プラグイン**（外部プロセス）とする（実装容易性・多言語対応のため）。

### 2.1 実行形式
Host はプラグイン実行ファイル（例: `tako-render-midi`）を起動し、サブコマンドで操作を指定する。

- `plugin-exe capabilities`
- `plugin-exe validate --score score.json --profile profile.json`
- `plugin-exe render   --score score.json --profile profile.json`

入出力は以下。
- `capabilities` は stdout に JSON を出力
- `validate` は stdout に `Diagnostic[]` JSON を出力（exit code は 0 を推奨。致命的エラーは 2 等でもよい）
- `render` は stdout に `Artifact[]` JSON を出力

> 例外: どうしても必要なら、host は `--out` を渡してファイル書き込みさせてもよい。だが JSON で Artifacts を返すのが規範。

## 3. バージョニング
- plugin protocol: `tako.pluginProtocolVersion = 1`
- `capabilities` の返す JSON は `protocolVersion` フィールドを **MUST** 持つ。

## 4. capabilities (必須)
### 4.1 返却 JSON (規範)
```
{
  "protocolVersion": 1,
  "id": "midi.smf",
  "version": "1.0.0",
  "supportedRoles": ["Instrument","Drums","Vocal","Automation"],
  "supportedEvents": ["note","drumHit","control","automation","marker","lyric"],
  "lyricSupport": {
    "text": false,
    "syllables": true,
    "phonemes": false,
    "alphabets": []
  },
  "paramSupport": {
    "namespaces": ["vocal","control","art","drum"],
    "patterns": ["vocal:*", "control:*"]
  },
  "degradeDefaults": "Drop"
}
```

### 4.2 解釈
- `supportedRoles`: TrackRole 対応
- `supportedEvents`: 対応イベント
- `lyricSupport`: ボーカル向け plugin は必ず宣言する（対応しないなら false）
- `paramSupport`: ParamId namespace とパターンで宣言
- `degradeDefaults`: 未対応要素の既定挙動（後述）

## 5. validate (必須)
### 5.1 入力
- `score.json` : `IR_V3.schema.json` に適合する Score
- `profile.json`: `PROFILE_V3.schema.json` に適合する RenderProfile

### 5.2 出力
`Diagnostic[]` を JSON 配列で返す。

Diagnostic（規範）:
```
{
  "level": "error" | "warning" | "info",
  "code": "midi.smf:missing_binding",
  "message": "Sound 'piano' is not bound in profile.",
  "location": { ... }   // optional
}
```

location（推奨）:
- `trackName`
- `placementIndex`
- `eventIndex`
- `pos`（Rat）

### 5.3 validate が必ず行うべき検査（MUST）
1) **binding 解決**: 全 Track が profile で binding 解決できること  
2) **drumMap**: `drumKit` のキーが必要な場合、全 `DrumKey` が map されること（Dropするなら warning を出す）  
3) **param/technique**: 未対応 `ParamId` / `TechniqueId` が存在する場合、degrade policy に従い warning/error を出す  
4) **時間/ピッチ制約**: ターゲット制約（例: MIDI 0..127）違反の診断  
5) **歌詞要件**: ボーカル合成 plugin が phoneme 必須などの場合、要求を error で通知し、可能なら remediation を message に含める（例: g2p を有効化せよ）

## 6. render (必須)
### 6.1 出力
`Artifact[]` を JSON 配列で返す。

Artifact（規範）:
```
{
  "kind": "file" | "dir" | "bundle" | "stream",
  "path": "out.mid",
  "mediaType": "audio/midi",
  "description": "Standard MIDI File"
}
```

### 6.2 degrade policy（規範）
未対応要素の扱いは以下3種:
- `Error`: 変換不能は error
- `Drop`: 落として warning（または info）
- `Approx`: 近似して warning（例: curve を階段化、cents を丸め）

Profile は `degradePolicy` で上書きしてよい。plugin は validate で最終 policy を明示することを推奨（SHOULD）。

## 7. Render Profile binding 解決（MUST）
Binding 解決順序（優先度の高い順）:
1) selector.trackName
2) selector.sound
3) selector.role

一致が複数ある場合は **最初に出現した binding** を採用する（MUST）。

## 8. 例: MIDI plugin の config（参考）
`config` は plugin 定義だが、MIDI plugin では以下が一般的。

- instrument:
  - `ch`: 1..16
  - `program`: 0..127
  - `bankMSB`, `bankLSB`（任意）
- drumKit:
  - `ch`: 通常 10
  - `drumMap`: `{ "kick": 36, ... }`

---
