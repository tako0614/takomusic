# Tako v3 Standard Library Specification (std:* / 確定版)

この文書は v3 の標準ライブラリ API を規定する。
std は **バックエンド非依存**であり、Renderer Plugin を直接呼ばない（MUST）。

## 1. 共通規則
- std 関数は原則として純粋（`Clip -> Clip`, `Score -> Score`）
- 乱数は `Rng` を引数で受け取る（決定性）
- 例外（MAY）: デバッグ用に `std:debug` を設ける場合は、IR への埋め込みログのみ許可

## 2. モジュール一覧（規範）
- `std:core`
- `std:time`
- `std:random`
- `std:transform`
- `std:curves`
- `std:theory`
- `std:drums`
- `std:vocal`
- `std:analysis`（MAY だが推奨）

---

## 3. std:core

### 3.1 Clip 合成（必須）
- `concat(a: Clip, b: Clip) -> Clip`
  - b の全イベント start を `a.length` だけシフトして連結
- `overlay(a: Clip, b: Clip) -> Clip`
  - 同一時間軸に重ねる（イベントは単純結合）
- `repeat(c: Clip, n: Int) -> Clip`
- `slice(c: Clip, start: Pos, end: Pos) -> Clip`
- `mapEvents(c: Clip, f: (Event)->Event?) -> Clip`
  - `null` を返したイベントは削除

### 3.2 Score/Track 操作（推奨）
- `withTrack(score: Score, track: Track) -> Score`
- `mapTracks(score: Score, f: (Track)->Track) -> Score`

---

## 4. std:time
- `barBeat(bar:Int, beat:Int) -> PosRef`
- `resolvePos(posRef: PosRef, meterMap: [MeterEvent]) -> Pos`
- `dur(n:Int, d:Int) -> Dur`（= n/d）
- 代表 Dur 定数（SHOULD）:
  - `w,h,q,e,s,t,x`
  - `dot(d:Dur) -> Dur`

---

## 5. std:random
- `rng(seed: Int) -> Rng`
- `nextFloat(r: Rng) -> (Rng, Float)`（0..1）
- `nextInt(r: Rng, lo:Int, hi:Int) -> (Rng, Int)`（[lo,hi)）

> 実装者メモ: immutable RNG を推奨（関数が新しい RNG を返す）。

---

## 6. std:transform（非破壊変形）
- `transpose(c: Clip, semitones: Int) -> Clip`
- `stretch(c: Clip, factor: Rat) -> Clip`（時間スケール）
- `quantize(c: Clip, grid: Dur, strength: Float) -> Clip`
- `swing(c: Clip, grid: Dur, amount: Float) -> Clip`
- `humanize(c: Clip, r: Rng, timing: Float, velocity: Float) -> Clip`

---

## 7. std:curves
- `linear(a: Float, b: Float, steps: Int) -> Curve`
- `easeInOut(a: Float, b: Float, steps: Int) -> Curve`
- `piecewise(points: [(Float t, Float v)]) -> Curve`（t は 0..1）

---

## 8. std:theory（最小核）
実装が大きくなりやすいので、v3 MVP では以下の最小セットを規範とする。

- `majorTriad(root: Pitch) -> [Pitch]`
- `minorTriad(root: Pitch) -> [Pitch]`
- `scaleMajor(root: Pitch) -> [Pitch]`
- `scaleMinor(root: Pitch) -> [Pitch]`

（拡張は MAY）

---

## 9. std:drums（抽象キー）
- 抽象キー定数（SHOULD）:
  - `kick, snare, hhc, hho, crash, ride, tom1, tom2, tom3, clap, perc1 ...`
- `fourOnFloor(bars:Int, unit:Dur) -> Clip`
- `basicRock(bars:Int, unit:Dur) -> Clip`
- `fill(kind:String, length:Dur) -> Clip`
- `ghost(c: Clip, amount: Float) -> Clip`（velocity を減衰）

> 注意: ここで出るのは DrumKey（文字列）。MIDI ノート番号等の具体割当は Profile へ。

---

## 10. std:vocal（バックエンド非依存）

### 10.1 Lyric 生成
- `text(text:String, lang:String) -> Lyric`
- `syllables(tokens:[String|LyricToken], lang:String, words?:[[Int,Int]]) -> Lyric`
- `phonemes(groups:[[String]], lang:String, alphabet:String, words?:[[Int,Int]]) -> Lyric`
- `ext() -> LyricToken`

LyricToken:
- `S(text:String)`
- `Ext`（メリーシマ）

### 10.2 Underlay（割当）
- `align(c: Clip, lyric: Lyric, policy: AlignPolicy) -> Clip`

AlignPolicy:
- `Strict`
- `BestEffort`
- `MelismaHeuristic`

### 10.3 表現（vocal:* automation）
- `vibrato(c: Clip, depth:Float, rate:Float, start?:Pos, end?:Pos) -> Clip`
- `portamento(c: Clip, amount:Float, start?:Pos, end?:Pos) -> Clip`
- `breathiness(c: Clip, amount:Float, start?:Pos, end?:Pos) -> Clip`
- `loudness(c: Clip, curve:Curve, start:Pos, end:Pos) -> Clip`

---
