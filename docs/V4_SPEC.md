# Tako v4 Language Specification (Draft)

## Executive Summary

Tako v4 は v3 の実用経験から得られた課題を解決し、言語としての表現力とエコシステムの成熟度を大幅に向上させるメジャーアップデートである。

※ リポジトリの現状実装に対する棚卸しは `docs/V4_STATUS.md` を参照。

### 主要目標

1. **型システムの強化** - ジェネリクス、代数的データ型、パターンマッチング改善
2. **構文の洗練** - パイプライン演算子、テンプレートリテラル、分割代入
3. **時間モデルの拡張** - ネイティブ連符、グラデーショナルテンポ、アナクルーシス
4. **スコア合成** - Score/Track の合成可能性
5. **エコシステム** - パッケージマネージャー、LSP完全実装、ライブコーディング

---

## Part 1: Language Deficiencies in v3

### 1.1 型システムの限界

```mf
// v3: ジェネリクスがないため、各型ごとに関数を定義する必要がある
fn mapPitches(pitches: [Pitch], f: (Pitch) -> Pitch) -> [Pitch] { ... }
fn mapInts(ints: [Int], f: (Int) -> Int) -> [Int] { ... }  // 冗長

// v3: 型パターンマッチングがない
fn process(token: String | LyricToken) -> String {
  // token.kind でマッチするしかない
}

// v3: タプル分解がない
const result = divmod(10, 3);
const q = result[0];  // 冗長
const r = result[1];
```

### 1.2 構文の冗長性

```mf
// v3: アルペジオ生成が冗長
let c = clip {};
for (p in arpeggioUp(chord)) {
  c = concat(c, clip { note(p, s, vel: 0.7); });
}

// v3: 変換のチェーンが読みにくい
const result = transpose(quantize(humanize(swing(c, e, 0.3), rng, 0.01, 0.05)[1], s, 0.8), 12);

// v3: PosRef の動的生成に関数呼び出しが必要
place barBeat(n, 1) clip;  // n:1 と書きたい
```

### 1.3 時間モデルの制約

```mf
// v3: 連符のネイティブサポートがない
// 3連符を作るには手動計算
const tripletDur = q * (2/3);

// v3: 漸進的テンポ変更ができない
tempo {
  1:1 -> 120bpm;
  // ritardando を表現するには多数のポイントが必要
  5:1 -> 115bpm;
  5:3 -> 110bpm;
  // ...
}

// v3: アナクルーシス(弱起)に専用構文がない
const pickup = shift(clip { note(G4, q); }, -q);  // ワークアラウンド
```

### 1.4 スコア構造の限界

```mf
// v3: スコア合成ができない
// 複数のスコアをマージする手段がない

// v3: サウンド定義の再利用ができない
// 毎回 sound "piano" kind instrument { ... } を書く必要

// v3: トラックテンプレートがない
// 同じ構成のトラックを複数作る場合に冗長
```

---

## Part 2: v4 Language Specification

### 2.1 型システム

#### 2.1.1 ジェネリクス

```mf
// v4: ジェネリック関数
fn map<T, U>(items: [T], f: (T) -> U) -> [U] {
  let result: [U] = [];
  for (item in items) {
    result[result.length] = f(item);
  }
  return result;
}

fn filter<T>(items: [T], predicate: (T) -> Bool) -> [T] { ... }
fn fold<T, A>(items: [T], init: A, f: (A, T) -> A) -> A { ... }

// 使用例
const doubled = map(pitches, fn(p) { p + 12 });
const loud = filter(events, fn(e) { e.velocity > 0.8 });
```

#### 2.1.2 代数的データ型 (ADT)

```mf
// v4: enum / 直和型
enum ChordQuality {
  Major,
  Minor,
  Diminished,
  Augmented,
  Dominant7,
  Major7(Int),  // データを持つバリアント
}

// v4: type alias
type PitchClass = Int;  // 0-11
type Velocity = Float;  // 0.0-1.0

// v4: struct
struct ChordSymbol {
  root: PitchClass,
  quality: ChordQuality,
  bass: PitchClass?,
}
```

#### 2.1.3 改善されたパターンマッチング

```mf
// v4: 型パターンとバインディング
fn process(token: String | LyricToken) -> String {
  return match (token) {
    s: String -> "text: " + s,
    LyricToken { text, kind: "syllable" } -> "syllable: " + text,
    LyricToken { kind: "extend" } -> "melisma",
  };
}

// v4: ガード条件
fn describe(vel: Float) -> String {
  return match (vel) {
    v if v < 0.3 -> "soft",
    v if v < 0.7 -> "medium",
    v -> "loud",
  };
}

// v4: 範囲パターン
fn octaveName(pitch: Pitch) -> String {
  return match (midiNote(pitch)) {
    0..23 -> "sub-bass",
    24..47 -> "bass",
    48..71 -> "mid",
    72..95 -> "treble",
    96..127 -> "high",
  };
}
```

#### 2.1.4 タプル分解

```mf
// v4: タプル分解
const (quotient, remainder) = divmod(10, 3);
const (newRng, humanized) = humanize(clip, rng, 0.01, 0.05);

// v4: for ループでの分解
for ((index, event) in enumerate(events)) {
  print("Event ${index}: ${event.type}");
}

// v4: 関数引数での分解
fn processResult((rng, clip): (Rng, Clip)) -> Clip { ... }
```

### 2.2 新しい構文

#### 2.2.1 パイプライン演算子

```mf
// v4: |> パイプライン演算子
const result = clip
  |> swing(e, 0.3)
  |> humanize(rng, 0.01, 0.05)
  |> transpose(12)
  |> quantize(s, 0.8);

// v3 との比較（冗長）
const result = quantize(transpose(humanize(swing(clip, e, 0.3), rng, 0.01, 0.05)[1], 12), s, 0.8);
```

#### 2.2.2 テンプレートリテラル

```mf
// v4: 文字列補間
const title = "Song in ${keyName}";
const label = "Bar ${bar}, Beat ${beat}";

// v4: マルチライン文字列
const lyrics = """
  Verse 1:
  Hello world
  Goodbye moon
""";
```

#### 2.2.3 スプレッド演算子

```mf
// v4: 配列スプレッド
const all = [...part1, ...part2, C4];
const extended = [...baseChord, root + 12];

// v4: オブジェクトスプレッド
const newOpts = { ...defaultOpts, vel: 0.9 };
```

#### 2.2.4 動的 PosRef

```mf
// v4: 計算された bar:beat
place ${n}:1 clip;           // 動的バー番号
place ${bar}:${beat} clip;   // 完全動的

// v4: 範囲での place
place 1:1..8:1 repeat(pattern, 8);  // 8小節分を自動分割
```

#### 2.2.5 Clip リテラル拡張

```mf
// v4: インラインアルペジオ
clip {
  arp(majorTriad(C4), s, up, vel: 0.7);  // 上行アルペジオを1行で
  arp(minorTriad(A3), s, down);          // 下行アルペジオ
  arp(chord, e, updown);                 // 上下
}

// v4: 連符リテラル
clip {
  triplet(3) {           // 3連符: 3つの音符を2拍分に収める
    note(C4, q);
    note(E4, q);
    note(G4, q);
  }

  triplet(3, 2) {        // 明示的: 3つの音符を2拍分に
    note(C4, q);
    note(E4, q);
    note(G4, q);
  }

  tuplet(5, 4) {         // 5連符: 5つの音符を4拍分に
    note(C4, e);
    note(D4, e);
    note(E4, e);
    note(F4, e);
    note(G4, e);
  }
}

// v4: 条件付きイベント
clip {
  note(C4, q);
  if (variation > 0.5) {
    note(E4, e);
    note(F4, e);
  } else {
    note(D4, q);
  }
}
```

### 2.3 時間モデルの拡張

#### 2.3.1 グラデーショナルテンポ

```mf
// v4: 漸進的テンポ変更
tempo {
  1:1 -> 120bpm;
  5:1 -> 80bpm over 4bars curve: easeOut;   // 4小節かけて減速
  9:1 -> 140bpm over 2bars curve: linear;   // 2小節で加速
}

// v4: テンポカーブ関数
tempo {
  1:1 -> tempoCurve(120, 80, 8bars, curve: easeInOut);
}
```

#### 2.3.2 アナクルーシス（弱起）

```mf
// v4: ネイティブ弱起サポート
score {
  anacrusis q;  // 1拍の弱起を宣言

  meter { 1:1 -> 4/4; }

  track "Melody" role Instrument sound "piano" {
    place 0:4 pickupNote();  // bar 0 = 弱起小節
    place 1:1 mainMelody();
  }
}
```

#### 2.3.3 連符 (Tuplets)

```mf
// v4: 連符デュレーションリテラル
const tripletQ = 3q;     // 3連符の4分音符 (= q * 2/3)
const quintE = 5e;       // 5連符の8分音符 (= e * 4/5)

// v4: 連符ブロック
const tripletClip = triplet(3, 2) {  // 2拍に3つ
  note(C4, q);
  note(E4, q);
  note(G4, q);
};

// v4: ネストした連符
const complexRhythm = triplet {
  note(C4, e);
  duplet { note(D4, s); note(E4, s); }  // 連符内の2連符
  note(F4, e);
};
```

### 2.4 スコア合成

#### 2.4.1 スコアマージ

```mf
// v4: スコア合成演算子
const fullScore = introScore ++ verseScore ++ chorusScore;

// v4: merge 関数
const combined = merge(
  drumScore,
  bassScore,
  keyboardScore,
  strategy: "overlay",  // または "concat"
  resolveConflicts: fn(a, b) { a }
);
```

#### 2.4.2 サウンドテンプレート

```mf
// v4: サウンド定義のインポート/エクスポート
// sounds.mf
export sound "gm_piano" kind instrument {
  label "Grand Piano";
  family "keyboard";
  range A0..C8;
  hints { gm_program: 0; }
}

// main.mf
import { gm_piano } from "./sounds.mf";

score {
  use gm_piano as "piano";  // サウンドを使用

  track "Piano" role Instrument sound "piano" {
    ...
  }
}
```

#### 2.4.3 トラックテンプレート

```mf
// v4: トラックテンプレート
template trackTemplate(name: String, clips: [Clip]) {
  track name role Instrument sound "piano" {
    for ((i, clip) in enumerate(clips)) {
      place ${i * 4 + 1}:1 clip;
    }
  }
}

score {
  ...
  trackTemplate("Left Hand", [lh1, lh2, lh3, lh4]);
  trackTemplate("Right Hand", [rh1, rh2, rh3, rh4]);
}
```

### 2.5 マクロシステム

```mf
// v4: コンパイル時マクロ
macro repeat_notes!(pitch, count) {
  for (i in 0..(count - 1)) {
    note(pitch, e, vel: 0.5 + i * 0.1);
  }
}

clip {
  repeat_notes!(C4, 4);  // 展開される
}

// v4: DSL拡張マクロ
macro guitar_tab!(string, fret, dur) {
  const pitch = guitarPitch(string, fret);
  note(pitch, dur, tech: [palm_mute]);
}

clip {
  guitar_tab!(6, 0, e);  // 6弦開放
  guitar_tab!(5, 2, e);
}
```

### 2.6 エラーハンドリング

```mf
// v4: Result 型
type Result<T, E> = Ok(T) | Err(E);

fn safeDivide(a: Int, b: Int) -> Result<Rat, String> {
  if (b == 0) {
    return Err("Division by zero");
  }
  return Ok(a / b);
}

// v4: ? 演算子（早期リターン）
fn process() -> Result<Clip, String> {
  const ratio = safeDivide(a, b)?;  // Err なら即座にリターン
  return Ok(clip { ... });
}

// v4: try-catch 式
const result = try {
  dangerousOperation()
} catch (e: MusicError) {
  defaultClip()
};
```

---

## Part 3: Standard Library Enhancements

### 3.1 std:core v4

```mf
// 新規追加
fn map<T, U>(items: [T], f: (T) -> U) -> [U]
fn filter<T>(items: [T], pred: (T) -> Bool) -> [T]
fn fold<T, A>(items: [T], init: A, f: (A, T) -> A) -> A
fn flatMap<T, U>(items: [T], f: (T) -> [U]) -> [U]
fn zip<T, U>(a: [T], b: [U]) -> [(T, U)]
fn enumerate<T>(items: [T]) -> [(Int, T)]
fn range(start: Int, end: Int, step?: Int) -> [Int]

// Clip 操作強化
fn merge(clips: [Clip]) -> Clip  // 複数クリップの一括オーバーレイ
fn split(c: Clip, positions: [Pos]) -> [Clip]  // 複数位置で分割
fn reverse(c: Clip) -> Clip  // イベント順序を逆転
fn invert(c: Clip, axis: Pitch) -> Clip  // ピッチを軸で反転
fn retrograde(c: Clip) -> Clip  // 逆行形
fn augment(c: Clip, factor: Rat) -> Clip  // 拡大形
fn diminish(c: Clip, factor: Rat) -> Clip  // 縮小形
```

### 3.2 std:theory v4

```mf
// コード解析
fn analyze(pitches: [Pitch]) -> ChordSymbol?
fn voiceLead(from: [Pitch], to: [Pitch]) -> [Pitch]  // ボイスリーディング
fn commonTones(a: [Pitch], b: [Pitch]) -> [Pitch]

// スケール操作
fn degreeToChord(scale: [Pitch], degree: Int, kind: ChordKind) -> [Pitch]
fn harmonize(melody: Clip, scale: [Pitch], style: HarmonizeStyle) -> Clip

// 新コード種別
fn add2(root: Pitch) -> [Pitch]
fn add4(root: Pitch) -> [Pitch]
fn six(root: Pitch) -> [Pitch]
fn sixNine(root: Pitch) -> [Pitch]
fn alterations(chord: [Pitch], alts: [Alteration]) -> [Pitch]

// プログレッション生成
fn randomProgression(scale: [Pitch], length: Int, rng: Rng) -> [[Pitch]]
fn modulate(progression: [[Pitch]], from: Pitch, to: Pitch) -> [[Pitch]]
```

### 3.3 std:rhythm v4 (新規)

```mf
// リズムパターン生成
fn euclidean(hits: Int, steps: Int, rotation?: Int) -> [Bool]
fn polyrhythm(a: Int, b: Int, duration: Dur) -> Clip
fn crossRhythm(pattern: [Dur], against: Dur) -> Clip

// グルーヴテンプレート
fn groove(name: String, intensity: Float) -> GrooveMap
fn applyGroove(c: Clip, groove: GrooveMap) -> Clip

// 標準グルーヴ
const SWING_LIGHT: GrooveMap
const SWING_HARD: GrooveMap
const SHUFFLE: GrooveMap
const FUNK_16TH: GrooveMap
const LATIN_CLAVE: GrooveMap
```

### 3.4 std:midi v4 (新規)

```mf
// MIDI インポート
fn importMidi(path: String) -> Score
fn importMidiTrack(path: String, trackIndex: Int) -> Clip

// MIDI エクスポート（IR 経由でなく直接）
fn exportMidi(score: Score, path: String, opts?: MidiExportOpts)

// MIDI CC 操作
fn ccCurve(ccNum: Int, curve: Curve, start: Pos, end: Pos) -> Clip
fn pitchBend(curve: Curve, start: Pos, end: Pos) -> Clip
fn aftertouch(curve: Curve, start: Pos, end: Pos) -> Clip
```

### 3.5 std:audio v4 (新規)

```mf
// オーディオ解析（プレイグラウンド/Web Audio 用）
fn analyze(audio: AudioBuffer) -> AnalysisResult
fn detectTempo(audio: AudioBuffer) -> Float
fn detectKey(audio: AudioBuffer) -> (Pitch, Mode)
fn transcribe(audio: AudioBuffer, opts?: TranscribeOpts) -> Clip
```

---

## Part 4: Ecosystem Enhancements

### 4.1 パッケージマネージャー (tako)

```bash
# パッケージ管理
tako init                    # プロジェクト初期化
tako add @tako/drums-jazz    # パッケージ追加
tako remove @tako/drums-jazz
tako update
tako publish                 # レジストリに公開

# tako.toml
[package]
name = "my-song"
version = "1.0.0"

[dependencies]
"@tako/drums-jazz" = "^2.0"
"@tako/synth-presets" = "~1.5"

[dev-dependencies]
"@tako/test-utils" = "*"
```

### 4.2 LSP 完全実装

```
// 対応機能
- シンタックスハイライト
- 自動補完（関数、変数、ピッチ、デュレーション）
- ホバー情報（型、ドキュメント）
- 定義ジャンプ
- 参照検索
- リネーム
- シグネチャヘルプ
- コードアクション（自動 import、リファクタリング）
- エラー診断（リアルタイム）
- フォーマッター
- デバッガ統合
```

### 4.3 ライブコーディング

```mf
// v4: ライブモード
#[live]
export fn main() -> Score {
  return score {
    // コード変更時に自動更新
    // 再生位置を維持したままホットリロード
  };
}

// ライブパラメータ
#[live_param(min: 60, max: 180)]
const tempo = 120;

#[live_param(min: 0.0, max: 1.0)]
const filterCutoff = 0.5;
```

### 4.4 ビジュアルプレビュー

```
// Web Playground 拡張
- ピアノロール表示
- スコア表示（五線譜）
- 波形表示
- スペクトログラム
- ミキサービュー
- タイムライン
```

### 4.5 テストフレームワーク

```mf
// v4: ネイティブテスト
#[test]
fn test_major_triad() {
  const chord = majorTriad(C4);
  assert_eq(chord, [C4, E4, G4]);
}

#[test]
fn test_clip_length() {
  const c = clip {
    note(C4, q);
    note(E4, q);
  };
  assert_eq(length(c), h);
}

#[test]
#[should_panic("Division by zero")]
fn test_division_error() {
  const _ = 1 / 0;
}
```

### 4.6 デバッガ

```mf
// v4: デバッグポイント
fn complexFunction() -> Clip {
  const a = someCalculation();
  #[breakpoint]  // ここで停止
  const b = transform(a);

  #[watch(b.length)]  // 値を監視
  return process(b);
}

// REPL デバッグ
// > :break at complexFunction:5
// > :watch a.events.length
// > :step
// > :continue
```

---

## Part 5: IR Schema v4

### 5.1 変更点

```json
{
  "tako": {
    "irVersion": 4,
    "language": "tako-v4"
  },
  "meta": {
    "title": "...",
    "anacrusis": { "n": 1, "d": 4 }  // 弱起情報
  },
  "tempoMap": [
    {
      "at": { "n": 0, "d": 1 },
      "bpm": 120,
      "curve": {  // v4: テンポカーブ
        "to": 80,
        "duration": { "n": 4, "d": 1 },
        "type": "easeOut"
      }
    }
  ],
  "tuplets": [  // v4: 連符情報
    {
      "id": "t1",
      "ratio": { "actual": 3, "normal": 2 },
      "duration": { "n": 1, "d": 2 }
    }
  ],
  "tracks": [
    {
      "events": [
        {
          "type": "note",
          "tuplet": "t1",  // v4: 連符参照
          "..."
        }
      ]
    }
  ]
}
```

---

## Part 6: Migration Guide (v3 → v4)

### 6.1 破壊的変更

| v3 | v4 | 移行方法 |
|----|----|---------|
| `humanize(c, r, t, v)` returns `[Rng, Clip]` | Returns `(Rng, Clip)` tuple | `const (r2, c2) = humanize(...)` |
| `divmod` returns array | Returns tuple | `const (q, r) = divmod(...)` |
| `PosRef` literal only | Dynamic `${n}:${m}` allowed | No change needed |
| No gradual tempo | `over Xbars` syntax | Update tempo blocks |

### 6.2 自動移行ツール

```bash
tako migrate --from v3 --to v4 src/
```

### 6.3 互換モード

```toml
# tako.toml
[compiler]
compatibility = "v3"  # v3 互換モードで実行
```

---

## Part 7: Implementation Roadmap

> **Note**: 実装状況の詳細は [V4_STATUS.md](V4_STATUS.md) を参照。

### Phase 1: Core Language ✅
- [x] 型システム強化（`enum` / `type` alias）
- [x] パターンマッチング（`match` + ガード条件 + 数値レンジ `a..b`）
- [x] タプル分解 `const (a, b, ...rest) = expr`
- [x] パイプライン演算子 `|>`
- [x] テンプレートリテラル `"Hello ${name}"`
- [x] スプレッド演算子 `[...arr]`, `{...obj}`
- [x] Nullish coalescing `??`
- [ ] ジェネリクス推論・制約（構文はあるが軽量実装のみ）

### Phase 2: Time Model ✅
- [x] グラデーショナルテンポ（`ramp` / `ease` 関数）
- [x] ネイティブ連符（`triplet(n)` / `tuplet(n, inTime)`）
- [x] アナクルーシスサポート（`meta { anacrusis ...; }`）
- [x] アルペジオ（`arp(chord, dur, direction)`）
- [x] IR Schema v4（`irVersion: 4`）

### Phase 3: Score Composition
- [ ] スコアマージ
- [ ] サウンドテンプレート
- [ ] トラックテンプレート

### Phase 4: Ecosystem
- [x] LSP 基本実装（診断、ホバー、補完）
- [ ] LSP 完全実装（リファクタリング等）
- [ ] パッケージマネージャー
- [ ] テストフレームワーク
- [ ] デバッガ

### Phase 5: Advanced Features
- [ ] `struct` 宣言
- [ ] マクロシステム `macro!`
- [ ] Result 型 + `?` 演算子
- [ ] 動的 PosRef（文字列外）
- [ ] ライブコーディング
- [ ] ビジュアルプレビュー
- [ ] MIDI インポート

---

## Appendix: Complete Grammar Changes

```ebnf
// v4 追加文法

// ジェネリクス
TypeParams ::= '<' Ident (',' Ident)* '>'
GenericType ::= Ident TypeParams?

// パイプライン
PipeExpr ::= Expr ('|>' FnCall)+

// テンプレートリテラル
TemplateString ::= '"' (Char | '${' Expr '}')* '"'

// 動的 PosRef
DynPosRef ::= '${' Expr '}' ':' Expr
           | Expr ':' '${' Expr '}'
           | '${' Expr '}' ':' '${' Expr '}'

// タプル分解
TuplePattern ::= '(' Ident (',' Ident)* ')'
LetTuple ::= 'const' TuplePattern '=' Expr

// 連符
TupletBlock ::= 'triplet' Block
              | 'tuplet' '(' Int ',' Int ')' Block

// テンポカーブ
TempoEntry ::= PosRef '->' Int 'bpm' TempoOpts?
TempoOpts ::= 'over' Duration 'curve' ':' Ident

// マクロ
MacroDef ::= 'macro' Ident '!' '(' Params ')' Block
MacroCall ::= Ident '!' '(' Args ')'
```

---

## References

- [Rust Language](https://www.rust-lang.org/) - 型システム、パターンマッチング参考
- [Sonic Pi](https://sonic-pi.net/) - ライブコーディング参考
- [Tidal Cycles](https://tidalcycles.org/) - パターン生成参考
- [LilyPond](http://lilypond.org/) - 楽譜表現参考
- [ABC Notation](https://abcnotation.com/) - 簡潔な記法参考
