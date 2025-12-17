# MusicForge v0.1 確定仕様

## 0. スコープ

### 0.1 目的

* **専用言語（MFS）**で曲を書く
* 1つのソースから **2つのレンダーパス**を選べる

  * **miku**：VSQX生成 →（Piapro取り込みは manual/戦略）→ DAWでミックスダウン
  * **cli**：MusicXML + MIDI生成 → CLIレンダ → FFmpeg等でmix → WAV完結
* 開発体験（DX）：`fmt/check/build/render` を標準化し、差分・再現性を担保する

### 0.2 非目的（v0.1でやらない）

* 汎用プログラミング言語（while、再帰、I/O、eval 等）
* Piaproの「VSQXインポート」を公式APIとして保証する（難しいため、**戦略化**してmanualを標準）
* 高度な調声（ピッチカーブ、表情パラメータ等）の完全対応（IRの拡張余地は残すが v0.1 では扱わない）

---

# 1. リポジトリ／プロジェクト構造

### 必須ファイル

* `mfconfig.toml`：プロジェクト設定
* `src/main.mf`：エントリ（必ず `export proc main()` を持つ）

### 推奨ディレクトリ

* `src/`：MFSソース
* `dist/`：ビルド成果物（IR、派生ファイル）
* `out/`：レンダー成果物（WAV等）
* `reaper/`：DAWプロジェクト等（miku用）
* `tools/`：外部エンジン（cli用、任意）

---

# 2. CLI（mf）仕様 v0.1

## 2.1 コマンド（確定）

* `mf init`
  雛形生成（miku/cliの両profileを含む）
* `mf fmt [path...]`
  MFSをフォーマット（標準形へ正規化）
* `mf check [-p profile]`
  構文・型・音楽lint（エラーコード付き）
* `mf build [-p profile|all]`
  `dist/song.ir.json` を必ず生成。profile指定時は派生物も生成。
* `mf render -p <profile|all>`
  profileに従ってレンダー（外部コマンド呼び出し）
* `mf doctor [-p profile]`
  外部依存（reaper/ffmpeg/各エンジン）の存在確認

## 2.2 終了コード（確定）

* `0`：成功
* `2`：check/build の静的エラー（E***）
* `3`：I/Oエラー（ファイル読み書き失敗）
* `4`：外部ツール実行失敗（backend error、非0終了など）
* `5`：外部依存不足（doctorで検出）

---

# 3. 設定ファイル `mfconfig.toml`（確定）

```toml
[project]
entry = "src/main.mf"
dist  = "dist"
out   = "out"
default_profile = "cli"

[profiles.miku]
backend = "miku-daw"
# VSQXをDAW側へ反映する手段（v0.1では manual が標準）
import_strategy = "manual" # manual のみ確定。ui は v0.2 以降。
# DAWレンダ（REAPER等）用：実行ファイルと引数テンプレ
daw_exe  = "reaper"
daw_args = ["-renderproject", "{project}"] # 例（環境依存）
daw_project = "reaper/song.rpp"
vsqx_out     = "dist/vocal.vsqx"
tempo_mid_out= "dist/tempo.mid"
render_out   = "out/mix.wav"

[profiles.cli]
backend = "headless"
# vocalエンジン・midiレンダラ・mixer は外部コマンドで呼ぶ（テンプレ方式）
vocal_cmd = ["neutrino-run", "{musicxml}", "{vocal_wav}"]   # 例
midi_cmd  = ["fluidsynth-run", "{mid}", "{band_wav}"]       # 例
mix_cmd   = ["ffmpeg", "-i", "{vocal_wav}", "-i", "{band_wav}", "{mix_wav}"] # 例
musicxml_out = "dist/vocal.musicxml"
band_mid_out = "dist/band.mid"
render_out   = "out/mix.wav"
```

### テンプレ変数（確定）

* `{project}`：DAWプロジェクトファイル（例：`.rpp`）
* `{vsqx}`：VSQX出力パス
* `{tempo_mid}`：tempo.mid出力パス
* `{musicxml}`：vocal.musicxml出力パス
* `{mid}`：band.mid出力パス
* `{vocal_wav}`：out/vocal.wav（固定生成先）
* `{band_wav}`：out/band.wav（固定生成先）
* `{mix_wav}`：out/mix.wav（最終）

---

# 4. MFS 言語仕様 v0.1（JSライク括弧構文）確定

## 4.1 ファイル／文字／コメント

* UTF-8
* コメント：`//`、`/* ... */`
* 文末：**`;` 必須**（フォーマッタで付与）

## 4.2 予約語（確定）

`import export proc const let if else for in true false`

## 4.3 リテラル（確定）

### Pitch literal

* `C4`, `C#4`, `Db4`, `Bb3` 等
* MIDI換算：`C4 = 60`
* Pitch演算：`Pitch + Int` / `Pitch - Int`（半音単位）を許可

### Dur literal

* **Durは「全音符（whole note）に対する分数」**として表記する
  例：`1/4`（四分音符）、`1/8`（八分）、`3/8`（付点四分相当）、`1/12`（三連系も表現可）
* v0.1の演算：

  * `Dur + Dur`
  * `Dur * Int`（整数倍）
  * `Dur`の負や0はエラー

> 注意：v0.1では **数値除算の `/` 演算子は存在しません**。`/` は Dur リテラル専用です（曖昧性排除のため）。

### Time literal

* `bar:beat` または `bar:beat:sub`

  * `bar`/`beat` は 1始まり
  * `sub` は 0始まり（beat内のtick）
* 例：`1:1` は `1:1:0` と等価

### Range literal

* `a..b`（a以上b未満）
* `a..=b`（a以上b以下）

---

## 4.4 型（確定）

* `Int`, `Float`, `Bool`, `String`
* `Pitch`, `Dur`, `Time`

型注釈は v0.1 では **提供しない**（推論のみ）。
ただし、組み込み関数の引数で型が合わない場合はエラー。

---

## 4.5 モジュール（import/export）確定

### import

```mfs
import { CHORUS } from "./phrases/chorus.mf";
```

### export

```mfs
export proc CHORUS(root) { ... }
export const ROOT = C4;
```

### 副作用禁止（確定）

* importされるモジュールのトップレベルで許可されるのは：

  * `import ...;`
  * `const/let`（初期化式は副作用なしに限る）
  * `proc` 定義
* **トップレベルで `track(...) {}`, `note(...)`, `tempo(...)` などの実行文は禁止**

---

## 4.6 エントリポイント（確定）

エントリモジュール（通常 `src/main.mf`）は必ず：

```mfs
export proc main() {
  ...
}
```

を持つこと。`main()` が1回だけ実行され、IRが生成される。

---

# 5. 実行モデル（音楽生成の意味論）確定

## 5.1 実行は“2フェーズ”（確定）

### Phase 1：グローバル設定フェーズ（header）

`main()` 内で **最初の `track(...)` 実行まで**に呼べるのは、次のみ：

* `title(string);`（任意）
* `ppq(int);`（必須、1回のみ）
* `timeSig(num, den);` / `timeSig(time, num, den);`
* `tempo(bpm);` / `tempo(time, bpm);`

**確定ルール**

* `track(...)` が一度でも実行された後は、上記のグローバル関数を呼ぶと **エラー（E050）**。
* `ppq` 未設定は **エラー（E001）**。
* `timeSig` / `tempo` は tick=0 相当が必須（無い場合エラー）。

### Phase 2：トラック構築フェーズ

`track(...) { ... }` 内でイベントを発行していく。

---

## 5.2 時間解決の確定ルール

### tick換算

* `ppq` は「四分音符あたりtick」
* Dur `n/d` は「全音符に対する分数」なので tick は：

`ticks = ppq * 4 * n / d`

* 上式が整数にならない場合 **エラー（E101）**（v0.1は丸め禁止）

### `Time(bar:beat:sub)` → tick（確定）

* timeSigイベントは「小節境界」でのみ変更可能
* 各小節の `ticksPerBeat` は
  `ppq * (4 / denominator)`
* `sub` は「beat内tick」で、`0 <= sub < ticksPerBeat` を満たさない場合は **エラー（E102）**

---

## 5.3 トラックとカーソル（確定）

### trackブロック

```mfs
track(vocal, vocal1, { engine: "piapro", voice: "miku" }) {
  ...
}
```

* `kind` は `vocal` または `midi`（予約語）
* `id` は識別子（例：`vocal1`, `drums`）
* `opts` はオプション（省略可）
* ブロック中、**currentTrack = id**
* ブロック終了で元の currentTrack に戻る（ネスト可能）

### カーソルの永続性（確定）

* トラックごとに `cursorTick` を保持
* 同じ `id` の track を再度開いた場合、カーソルは **前回の続き**（リセットしない）
* したがって、明示的に `at(...)` を書くのが推奨（fmt/checkは強制しない）

---

# 6. 組み込み関数（intrinsics）確定

## 6.1 グローバル（header限定）

* `title(s: String);`
* `ppq(v: Int);`
* `tempo(bpm: Int|Float);`
* `tempo(t: Time, bpm: Int|Float);`
* `timeSig(n: Int, d: Int);`
* `timeSig(t: Time, n: Int, d: Int);`

**制約**

* `timeSig(t,...)` の t は **bar:1:0** のみ許可（小節頭以外はエラー E020）
* tempo はステップのみ（ランプ概念なし）

## 6.2 トラック

* `track(kind, id, opts?) { ... }`

`opts`（v0.1で解釈するキー）

* vocal：

  * `engine: String`（例 `"piapro"`）※メタ（出力時のヒント）
  * `voice: String`（例 `"miku"`）※メタ
* midi：

  * `ch: Int`（1..16、内部0..15）
  * `program: Int`（0..127、任意）
  * `vel: Int`（1..127、defaultVel）

`opts` は **ネスト禁止**（一次元のキー値のみ）

## 6.3 カーソル操作（track内）

* `at(t: Time);`（絶対移動）
* `atTick(tick: Int);`（絶対tick）
* `advance(d: Dur);`（相対）
* `advanceTick(dt: Int);`（相対）

## 6.4 イベント発行（track内）

### vocalトラック

* `note(p: Pitch, d: Dur, lyric: String);`
* `rest(d: Dur);`

**制約**

* vocalは **単音（モノフォニック）**：ノート重なりはエラー（E200）

### midiトラック

* `note(p: Pitch, d: Dur);`（velは defaultVel）
* `note(p: Pitch, d: Dur, vel: Int);`
* `rest(d: Dur);`
* `chord(pitches: [Pitch...], d: Dur);`
* `chord(pitches: [Pitch...], d: Dur, vel: Int);`
* `drum(name, d: Dur);`
* `drum(name, d: Dur, vel: Int);`
  ※ `drum` は `ch=10` 前提の糖衣（chの強制はしないが、lintでwarn可）

**ドラム名マップ（v0.1固定）**

* `kick=36`
* `snare=38`
* `hhc=42`（closed hihat）
* `hho=46`（open hihat）
* `tom1=50`
* `crash=49`
* `ride=51`

---

# 7. 制御構文（確定）

## 7.1 変数

* `const name = expr;`（再代入不可）
* `let name = expr;`（再代入可）
* 代入：`name = expr;`（letのみ）

## 7.2 if

```mfs
if (cond) { ... } else { ... }
```

## 7.3 for（有界レンジ）

```mfs
for (i in 1..=4) { ... }
```

**制約（確定）**

* 範囲の両端は **コンパイル時にIntへ解決**できる必要がある
  （例：`const bars = 4; for(i in 1..=bars)` はOK / `let bars` はNG）
* `break/continue` なし
* ループ回数上限：**100,000回**を超える場合はエラー（E401）
  （実行時間爆発防止。上限値は v0.1固定）

---

# 8. proc（手続き）確定

## 8.1 定義と呼び出し

```mfs
export proc CHORUS(root) {
  note(root, 1/8, "ら");
  note(root+2, 1/8, "ら");
}

CHORUS(C4);
```

## 8.2 ルール（確定）

* `proc` は **戻り値なし**（副作用でイベントを積む）
* `proc` は **呼び出し元の currentTrack / cursor を引き継ぐ**
* **再帰禁止**（直接・間接とも）：呼び出しグラフに循環があればエラー（E310）

---

# 9. 静的チェック（mf check）確定

## 9.1 エラーコード（確定）

* `E001` ppq未設定
* `E010` tempo(tick=0) 未設定
* `E011` timeSig(tick=0) 未設定
* `E020` timeSigが小節頭以外
* `E050` グローバル関数を track開始後に呼んだ
* `E101` Dur → tick が割り切れない
* `E102` Timeのsubがbeat内tick範囲外
* `E110` Pitchが0..127外
* `E200` vocalのノート重なり
* `E210` vocalのlyric欠落/空文字
* `E300` importモジュールにトップレベル実行文
* `E310` proc再帰（循環）
* `E400` 未定義シンボル
* `E401` forの展開回数が上限超え

## 9.2 警告コード（確定）

* `W100` 極端に短いノート（例：tick < ppq/16）
* `W110` 音域警告（例：vocalで key < 48 または > 84）
* `W200` tempoイベント多すぎ（例：>128）

---

# 10. フォーマット（mf fmt）確定

* セミコロン必須
* 2スペースインデント
* `import` は先頭寄せ、空行は最大1行
* 引数リスト・配列は `,` 後にスペース
* `track(...) {` は同一行
* `if (...) {` / `for (...) {` も同一行

---

# 11. IR（Song IR）v0.1 確定

## 11.1 出力ファイル

* `dist/song.ir.json`

## 11.2 スキーマ（確定）

```json
{
  "schemaVersion": "0.1",
  "title": "string|null",
  "ppq": 480,
  "tempos": [{ "tick": 0, "bpm": 120.0 }],
  "timeSigs": [{ "tick": 0, "numerator": 4, "denominator": 4 }],
  "tracks": [
    {
      "id": "vocal1",
      "kind": "vocal",
      "name": "vocal1",
      "meta": { "engine": "piapro", "voice": "miku" },
      "events": [
        { "type": "note", "tick": 0, "dur": 480, "key": 60, "lyric": "は" },
        { "type": "rest", "tick": 480, "dur": 240 }
      ]
    },
    {
      "id": "drums",
      "kind": "midi",
      "name": "drums",
      "channel": 9,
      "program": 0,
      "defaultVel": 96,
      "events": [
        { "type": "note", "tick": 0, "dur": 240, "key": 36, "vel": 110 }
      ]
    }
  ]
}
```

**確定ルール**

* `events` は **tick昇順**で出力（同tickは入力順）
* `tick`/`dur` は整数
* `key` は0..127
* vocal note は `lyric` 必須
* rest は vocal/midi共通で許可

---

# 12. プロファイル別の派生生成（mf build）確定

## 12.1 `-p miku`

* 必須：`dist/song.ir.json`
* 生成：`dist/vocal.vsqx`（vocalトラックのみ）
* 生成：`dist/tempo.mid`（tempo/timeSigのみ）

## 12.2 `-p cli`

* 必須：`dist/song.ir.json`
* 生成：`dist/vocal.musicxml`（vocalトラックのみ）
* 生成：`dist/band.mid`（midiトラックを1つにマージ）

## 12.3 `-p all`

* `miku` と `cli` の両方を生成

---

# 13. レンダー（mf render）確定

## 13.1 profile=miku（backend=miku-daw）

* v0.1標準は **manual戦略**：

  1. ユーザーがDAWプロジェクトを開き、Piapro側に `dist/vocal.vsqx` を読み込ませ、保存
  2. `mf render -p miku` が `daw_exe` + `daw_args` を実行し、`render_out` を生成する

## 13.2 profile=cli（backend=headless）

* `vocal_cmd`：`dist/vocal.musicxml` → `out/vocal.wav`
* `midi_cmd`：`dist/band.mid` → `out/band.wav`
* `mix_cmd`：`out/vocal.wav` + `out/band.wav` → `render_out`

**確定ルール**

* `out/vocal.wav` と `out/band.wav` は **固定中間ファイル名**（テンプレ変数で参照）
* どれかが非0終了なら exit=4

---

# 14. 確定サンプル（このままv0.1の正規形）

## `src/main.mf`

```mfs
import { CHORUS } from "./phrases/chorus.mf";
import { ROCK_1BAR } from "./phrases/drums.mf";

export proc main() {
  title("hello");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  track(vocal, vocal1, { engine: "piapro", voice: "miku" }) {
    at(1:1);
    note(C4, 1/4, "は");
    note(D4, 1/4, "じ");
    note(E4, 1/4, "め");
    note(F4, 1/4, "て");
    advance(1/4);
    CHORUS(C4);
  }

  track(midi, drums, { ch: 10, vel: 100, program: 0 }) {
    at(1:1);

    for (bar in 1..=4) {
      ROCK_1BAR();

      if (bar == 4) {
        drum(crash, 1/4, 120);
      }
    }
  }
}
```

## `src/phrases/chorus.mf`

```mfs
export proc CHORUS(root) {
  note(root,   1/8, "ら");
  note(root+2, 1/8, "ら");
  note(root+4, 1/8, "ら");
  note(root+7, 1/8, "ら");
}
```

## `src/phrases/drums.mf`

```mfs
export proc ROCK_1BAR() {
  drum(kick,  1/8, 110);
  drum(hhc,   1/8);
  drum(snare, 1/8, 110);
  drum(hhc,   1/8);
  drum(kick,  1/8, 110);
  drum(hhc,   1/8);
  drum(snare, 1/8, 110);
  drum(hhc,   1/8);
}
```


## これで仕様は v0.1 として確定です

次の段階（実装タスクへ落とす）に進む場合、最小の実装順は以下が最短です。

1. パーサ（上の構文セットのみ）
2. 実行器（proc/for/if + track/cursor + event積み）
3. IR出力（song.ir.json）
4. `build -p cli`（musicxml/midi生成）→ headless render
5. `build -p miku`（vsqx/tempo.mid生成）→ daw render（manual戦略）

この順で、あなたが求める「言語」「両バックエンド」「DX」を最短で成立させられます。
