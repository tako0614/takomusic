# TakoMusic 標準モジュール

標準モジュールはTakoMusic言語自体で実装された高レベルな音楽機能ライブラリです。
ビルトイン関数を組み合わせて、より表現力の高い音楽制作を可能にします。

```javascript
import { majorScale, majorTriad } from "std:theory";
import { staccato, legato } from "std:articulation";
```

---

## 目次

1. [theory](#theory) - 音楽理論（66関数）
2. [articulation](#articulation) - アーティキュレーション（7関数）
3. [ornaments](#ornaments) - 装飾音（9関数）
4. [rhythm](#rhythm) - リズムパターン（23関数）
5. [dynamics](#dynamics) - ダイナミクス（16関数）
6. [expression](#expression) - 表現技法（12関数）
7. [composition](#composition) - 作曲技法（24関数）
8. [genres](#genres) - ジャンル別パターン（19関数）
9. [curves](#curves) - カーブ・補間（15関数）
10. [patterns](#patterns) - パターン生成（11関数）
11. [notation](#notation) - 記譜法ヘルパー（18関数）
12. [utils](#utils) - ユーティリティ（18関数）

---

## theory

音楽理論関連の関数。スケール、コード、音程などを扱います。

```javascript
import { majorScale, minorTriad, QUARTER } from "std:theory";
```

### 基本コード（トライアド）

| 関数 | 説明 | 例 |
|------|------|-----|
| `majorTriad(root)` | メジャートライアド | `majorTriad(C4)` → [C4, E4, G4] |
| `minorTriad(root)` | マイナートライアド | `minorTriad(A4)` → [A4, C5, E5] |
| `diminishedTriad(root)` | ディミニッシュ | `diminishedTriad(B4)` |
| `augmentedTriad(root)` | オーギュメント | `augmentedTriad(C4)` |

### セブンスコード

| 関数 | 説明 |
|------|------|
| `majorSeventh(root)` | メジャー7th |
| `minorSeventh(root)` | マイナー7th |
| `dominantSeventh(root)` | ドミナント7th |
| `halfDiminishedSeventh(root)` | ハーフディミニッシュ |
| `diminishedSeventh(root)` | ディミニッシュ7th |

### サスペンデッド・アドコード

| 関数 | 説明 |
|------|------|
| `sus2(root)` | サスペンデッド2 |
| `sus4(root)` | サスペンデッド4 |
| `add9(root)` | アドナインス |
| `minorAdd9(root)` | マイナーアドナインス |

### 拡張コード

| 関数 | 説明 |
|------|------|
| `ninth(root)` | ドミナント9th |
| `minorNinth(root)` | マイナー9th |
| `majorNinth(root)` | メジャー9th |
| `eleventh(root)` | 11th |
| `thirteenth(root)` | 13th |

### シックス・パワーコード

| 関数 | 説明 |
|------|------|
| `sixth(root)` | メジャー6th |
| `minorSixth(root)` | マイナー6th |
| `powerChord(root)` | パワーコード（5度のみ） |
| `powerChordOctave(root)` | パワーコード（オクターブ付き） |

### スケール

| 関数 | 説明 |
|------|------|
| `majorScale(root)` | メジャースケール |
| `minorScale(root)` | ナチュラルマイナー |
| `harmonicMinor(root)` | ハーモニックマイナー |
| `melodicMinor(root)` | メロディックマイナー |
| `pentatonicMajor(root)` | メジャーペンタトニック |
| `pentatonicMinor(root)` | マイナーペンタトニック |
| `bluesScale(root)` | ブルーススケール |
| `wholeToneScale(root)` | ホールトーンスケール |
| `chromaticScale(root)` | クロマチックスケール |

### モード

| 関数 | 説明 |
|------|------|
| `dorianMode(root)` | ドリアン |
| `phrygianMode(root)` | フリジアン |
| `lydianMode(root)` | リディアン |
| `mixolydianMode(root)` | ミクソリディアン |
| `aeolianMode(root)` | エオリアン |
| `locrianMode(root)` | ロクリアン |

### ボイシング

| 関数 | 説明 |
|------|------|
| `firstInversion(chord)` | 第1転回形 |
| `secondInversion(chord)` | 第2転回形 |

### コード進行

| 関数 | 説明 |
|------|------|
| `scaleDegree(scale, degree)` | スケールの度数を取得 |
| `progression(scale, degrees, chordFunc)` | コード進行を生成 |
| `majorIIVI(root)` | II-V-I進行（メジャー） |
| `major145(root)` | I-IV-V進行（メジャー） |
| `minor145(root)` | i-iv-v進行（マイナー） |

### 定数

**音程**
```javascript
UNISON, MINOR_SECOND, MAJOR_SECOND, MINOR_THIRD, MAJOR_THIRD,
PERFECT_FOURTH, TRITONE, PERFECT_FIFTH, MINOR_SIXTH, MAJOR_SIXTH,
MINOR_SEVENTH, MAJOR_SEVENTH, OCTAVE
```

**音価**
```javascript
WHOLE, HALF, QUARTER, EIGHTH, SIXTEENTH, THIRTY_SECOND,
DOTTED_HALF, DOTTED_QUARTER, DOTTED_EIGHTH
```

---

## articulation

アーティキュレーション（奏法指示）の関数。

```javascript
import { staccato, legato, accent } from "std:articulation";
```

| 関数 | 説明 | 効果 |
|------|------|------|
| `staccato(pitch, dur, vel)` | スタッカート | 短く、やや強く |
| `legato(pitch, dur, vel)` | レガート | 滑らかに繋げる |
| `accent(pitch, dur, vel)` | アクセント | 強調（+20） |
| `tenuto(pitch, dur, vel)` | テヌート | 十分に保持 |
| `marcato(pitch, dur, vel)` | マルカート | 強いアクセント（+30） |
| `portato(pitch, dur, vel)` | ポルタート | 歯切れよく |
| `sforzando(pitch, dur, vel)` | スフォルツァンド | 突然強く（+40） |

---

## ornaments

装飾音・装飾記号の関数。

```javascript
import { trill, mordent, arpeggio } from "std:ornaments";
```

| 関数 | 説明 |
|------|------|
| `trill(pitch, dur, interval)` | トリル（2音の素早い交替） |
| `mordent(pitch, dur, interval)` | モルデント |
| `arpeggio(pitches, dur)` | アルペジオ |
| `tremolo(pitch, dur, rate)` | トレモロ |
| `turn(pitch, dur)` | ターン |
| `gruppetto(pitch, dur)` | グルペット |
| `appoggiatura(grace, main, dur)` | アポジャトゥーラ |
| `acciaccatura(grace, main, dur)` | アチャッカトゥーラ |
| `glissando(start, end, dur)` | グリッサンド |

---

## rhythm

リズムパターン生成の関数。

```javascript
import { euclidean, swing, groove } from "std:rhythm";
```

### 基本リズム

| 関数 | 説明 |
|------|------|
| `euclidean(steps, pulses, dur, pitch)` | ユークリッドリズム |
| `swing(notes, dur, amount)` | スウィング（0〜0.5） |
| `humanize(notes, dur, amount)` | ヒューマナイズ |
| `shuffle(notes, dur)` | シャッフル |
| `syncopate(notes, dur)` | シンコペーション |

### クラーベ

| 関数 | 説明 |
|------|------|
| `clave32(pitch, dur)` | 3-2クラーベ |
| `clave23(pitch, dur)` | 2-3クラーベ |

### ポリリズム

| 関数 | 説明 |
|------|------|
| `polyrhythmPattern(steps1, steps2, total)` | ポリリズムパターン生成 |
| `hemiola(notes, dur)` | ヘミオラ（3:2） |

### グルーヴ

| 関数 | 説明 |
|------|------|
| `groove(notes, dur, template)` | グルーヴテンプレート適用 |
| `swingGroove()` | スウィンググルーヴテンプレート |
| `laidBackGroove()` | レイドバックテンプレート |
| `pushGroove()` | プッシュテンプレート |

### テンポ変化

| 関数 | 説明 |
|------|------|
| `rubato(notes, baseDur, variation)` | ルバート |
| `accelerando(notes, startDur, endDur)` | アッチェレランド |
| `ritardando(notes, startDur, endDur)` | リタルダンド |
| `accelerandoTempo(startBpm, endBpm, dur, steps)` | テンポアッチェレランド |
| `ritardandoTempo(startBpm, endBpm, dur, steps)` | テンポリタルダンド |
| `fermata(pitch, baseDur, holdMultiplier)` | フェルマータ |
| `metricModulation(bpm, oldSub, newSub)` | 拍子変調 |

### 連符

| 関数 | 説明 |
|------|------|
| `tuplet(notes, totalDur, ratio)` | 連符 |
| `triplet(notes, baseDur)` | 3連符 |

### ドラムパターン

| 関数 | 説明 |
|------|------|
| `basicBeat(kick, snare, hat, dur, bars)` | 基本ビート |

---

## dynamics

ダイナミクス（音量変化）の関数。

```javascript
import { crescendo, decrescendo, sforzando } from "std:dynamics";
```

### 漸強・漸弱

| 関数 | 説明 |
|------|------|
| `crescendo(notes, durs, startVel, endVel)` | クレシェンド |
| `decrescendo(notes, durs, startVel, endVel)` | デクレシェンド |
| `crescendoUniform(notes, dur, startVel, endVel)` | 均一デュレーション版 |
| `decrescendoUniform(notes, dur, startVel, endVel)` | 均一デュレーション版 |

### アクセント

| 関数 | 説明 |
|------|------|
| `accentPattern(notes, pattern, dur, baseVel, accentVel)` | アクセントパターン |
| `sforzando(pitch, dur, peakVel, sustainVel)` | sfz |
| `fortePiano(pitch, dur, forteVel, pianoVel)` | fp |
| `rinforzando(pitch, dur, vel)` | rfz |

### スウェル

| 関数 | 説明 |
|------|------|
| `swell(pitch, dur, minVel, maxVel, steps)` | メッサディヴォーチェ |
| `hairpinCresc(startVal, endVal, dur)` | ヘアピン（CC expression） |
| `hairpinDecresc(startVal, endVal, dur)` | ヘアピン減衰 |

### スビト

| 関数 | 説明 |
|------|------|
| `subitoForte(pitch, dur)` | 突然フォルテ |
| `subitoPiano(pitch, dur)` | 突然ピアノ |

### フェードアウト

| 関数 | 説明 |
|------|------|
| `morendo(notes, baseDur, startVel)` | モレンド（消えゆく） |
| `perdendosi(notes, baseDur, startVel)` | ペルデンドシ（完全に消える） |

---

## expression

表現技法（ピッチベンド、モジュレーション等）の関数。

```javascript
import { vibrato, portamento, bendUp } from "std:expression";
```

### ビブラート

| 関数 | 説明 |
|------|------|
| `vibrato(pitch, dur, depth, rate)` | ビブラート |
| `vibratoSimple(pitch, dur)` | シンプルビブラート |

### ピッチベンド

| 関数 | 説明 |
|------|------|
| `portamento(fromPitch, toPitch, dur)` | ポルタメント |
| `bendUp(pitch, dur, semitones)` | ベンドアップ |
| `bendDown(pitch, dur, semitones)` | ベンドダウン |
| `scoop(pitch, dur, semitones)` | スクープ（ジャズ） |
| `fall(pitch, dur, semitones)` | フォール（ジャズ） |
| `legatoSlide(from, to, dur, slideDur)` | レガートスライド |

### モジュレーション

| 関数 | 説明 |
|------|------|
| `modulationSwell(startVal, peakVal, dur)` | モジュレーションスウェル |
| `tremoloMod(pitch, dur, depth, rate)` | トレモロ（モジュレーション） |

### その他

| 関数 | 説明 |
|------|------|
| `breathController(startVal, endVal, dur)` | ブレスコントローラ（CC2） |

---

## composition

作曲技法の関数。

```javascript
import { sequence, ostinato, canon } from "std:composition";
```

### シーケンス

| 関数 | 説明 |
|------|------|
| `sequence(melody, intervals, dur)` | メロディックシーケンス |
| `sequenceWithDurs(melody, durs, intervals)` | デュレーション指定版 |

### コール＆レスポンス

| 関数 | 説明 |
|------|------|
| `callResponse(call, response, callDur, respDur, gap)` | コール＆レスポンス |
| `callEcho(call, callDur, interval, gap)` | エコー |

### オスティナート

| 関数 | 説明 |
|------|------|
| `ostinato(pattern, dur, repetitions)` | オスティナート |
| `ostinatoWithDurs(pattern, durs, repetitions)` | デュレーション指定版 |

### カノン・模倣

| 関数 | 説明 |
|------|------|
| `canonMelody(melody, dur, delayBeats)` | カノンメロディ |
| `canonEntry(melody, dur, entryNum, delayBeats)` | カノンエントリー |
| `imitation(melody, dur, interval, invert)` | 模倣 |
| `strettoEntry(melody, dur, entryOffset)` | ストレット |

### 変奏

| 関数 | 説明 |
|------|------|
| `variation(theme, dur, type)` | 変奏（"original", "octave", "retrograde", "augment", "diminish", "invert"） |

### ホケット・アンティフォナル

| 関数 | 説明 |
|------|------|
| `hocket(melody)` | ホケット（2声に分割） |
| `playHocket(pattern, dur)` | ホケット再生 |
| `antiphonal(group1, group2, dur, exchanges)` | 交唱 |

### 持続音

| 関数 | 説明 |
|------|------|
| `pedalPoint(pitch, dur, repetitions)` | ペダルポイント |
| `drone(pitches, dur)` | ドローン |

### アルペジオパターン

| 関数 | 説明 |
|------|------|
| `albertiPattern(chord, dur, repetitions)` | アルベルティバス |
| `brokenChordUp(chord, dur)` | 分散和音（上行） |
| `brokenChordDown(chord, dur)` | 分散和音（下行） |

### モチーフ展開

| 関数 | 説明 |
|------|------|
| `motifFragment(melody, start, end, dur)` | モチーフ断片 |
| `motifExtend(motif, dur, extensions)` | モチーフ拡張 |
| `displace(melody, dur, offsetDur)` | リズムディスプレイスメント |
| `layerMelody(melody, dur, startOffset)` | レイヤー |

---

## genres

ジャンル別パターンの関数。

```javascript
import { bossaNovaGuitar, funkDrums, fourOnFloor } from "std:genres";
```

### ボサノバ

| 関数 | 説明 |
|------|------|
| `bossaNovaGuitar(chordNotes, dur)` | ボサノバギターパターン |
| `bossaNovaDrums(dur, bars)` | ボサノバドラム |

### ファンク

| 関数 | 説明 |
|------|------|
| `funkStab(chordNotes, dur)` | ファンクスタブ |
| `funkDrums(dur, bars)` | ファンクドラム |

### レゲエ

| 関数 | 説明 |
|------|------|
| `reggaeSkank(chordNotes, dur, bars)` | レゲエスカンク |
| `reggaeOneDrop(dur, bars)` | ワンドロップ |

### EDM

| 関数 | 説明 |
|------|------|
| `fourOnFloor(dur, bars)` | フォーオンザフロア |
| `offbeatHiHat(dur, bars)` | オフビートハイハット |
| `edmBuildup(bars)` | ビルドアップ |

### ロック

| 関数 | 説明 |
|------|------|
| `rockBeat(dur, bars)` | ロックビート |
| `powerChordRiff(root, dur)` | パワーコードリフ |

### シャッフル/ブルース

| 関数 | 説明 |
|------|------|
| `shuffleBeat(dur, bars)` | シャッフルビート |

### ジャズ

| 関数 | 説明 |
|------|------|
| `jazzRide(dur, bars)` | ジャズライド |
| `jazzWalk(scale, dur, bars)` | ジャズウォーキング |

### ラテン

| 関数 | 説明 |
|------|------|
| `tumbaoBass(root, fifth, dur)` | トゥンバオベース |
| `salsaClave(dur, bars)` | サルサクラーベ |

### ディスコ/ヒップホップ

| 関数 | 説明 |
|------|------|
| `discoBeat(dur, bars)` | ディスコビート |
| `boomBap(dur, bars)` | ブームバップ |
| `trapHiHats(dur, bars)` | トラップハイハット |

---

## curves

カーブ・補間関数。オートメーションに使用します。

```javascript
import { linearCurve, smoothstep, easeInQuad } from "std:curves";
```

### カーブ生成

| 関数 | 説明 |
|------|------|
| `linearCurve(start, end, steps)` | 線形補間 |
| `easeInQuad(start, end, steps)` | イーズイン（2次） |
| `easeOutQuad(start, end, steps)` | イーズアウト（2次） |
| `easeInOutQuad(start, end, steps)` | イーズインアウト（2次） |
| `easeInCubic(start, end, steps)` | イーズイン（3次） |
| `easeOutCubic(start, end, steps)` | イーズアウト（3次） |
| `smoothstep(start, end, steps)` | スムースステップ |
| `exponentialCurve(start, end, steps, exp)` | 指数曲線 |

### オートメーション

| 関数 | 説明 |
|------|------|
| `applyCurveToCC(cc, curve, startTick, endTick)` | CCにカーブ適用 |
| `tempoCurveLinear(start, end, dur)` | テンポカーブ |
| `expressionCurveSmooth(start, end, dur)` | エクスプレッションカーブ |
| `volumeFade(start, end, dur)` | ボリュームフェード |
| `panSweep(start, end, dur)` | パンスウィープ |
| `pitchBendCurveSmooth(start, end, dur)` | ピッチベンドカーブ |

---

## patterns

高度なパターン生成アルゴリズム。

```javascript
import { randomWalk, markovMelody, phasePattern } from "std:patterns";
```

### メロディ生成

| 関数 | 説明 |
|------|------|
| `randomWalk(start, steps, maxStep)` | ランダムウォーク |
| `pentatonicWalk(root, steps)` | ペンタトニックウォーク |
| `fractalMelody(pattern, depth)` | フラクタルメロディ |
| `markovMelody(notes, prob, length, start)` | マルコフ連鎖メロディ |

### リズム生成

| 関数 | 説明 |
|------|------|
| `probabilityRhythm(steps, prob)` | 確率リズム |
| `densityRhythm(steps, startProb, endProb)` | 密度変化リズム |
| `polyrhythm(ratio1, ratio2, cycles)` | ポリリズム |
| `phasePattern(pattern, shift, reps)` | フェイズパターン |

### アルペジオ

| 関数 | 説明 |
|------|------|
| `arpeggiate(chord, pattern, dur)` | パターンアルペジオ |
| `arpeggioPattern(size, style, length)` | アルペジオパターン生成（"up", "down", "updown", "random"） |

---

## notation

記譜法ヘルパー関数。

```javascript
import { dynamicToVel, tempoToBpm, tripletFeel } from "std:notation";
```

### 変換

| 関数 | 説明 | 例 |
|------|------|-----|
| `dynamicToVel(marking)` | 強弱記号→ベロシティ | `dynamicToVel("ff")` → 120 |
| `tempoToBpm(marking)` | テンポ記号→BPM | `tempoToBpm("allegro")` → 130 |
| `noteNameToPitch(name, octave)` | 音名→ピッチ | `noteNameToPitch("C#", 4)` |

### リズム

| 関数 | 説明 |
|------|------|
| `tripletFeel(notes, dur)` | 3連符フィール |
| `dottedRhythm(notes, dur)` | 付点リズム |
| `augment(rhythms, factor)` | 拡大 |
| `diminish(rhythms, factor)` | 縮小 |
| `playTuplet(notes, dur, ratio)` | n連符 |

### 和声・旋律

| 関数 | 説明 |
|------|------|
| `harmonize(melody, interval, dur)` | 和声化 |
| `invertMelody(melody, axis)` | 反行 |
| `retrograde(melody)` | 逆行 |
| `scaleInRange(fn, root, octaves)` | 複数オクターブスケール |
| `melodyFromDegrees(scale, degrees, dur)` | 度数からメロディ |

### ベースライン

| 関数 | 説明 |
|------|------|
| `bassLine(chords, dur)` | ルートベースライン |
| `walkingBass(chord, next, dur)` | ウォーキングベース |
| `albertiBass(chord, reps, dur)` | アルベルティバス |

### その他

| 関数 | 説明 |
|------|------|
| `pickupNotes(notes, total, dur)` | アウフタクト |

---

## utils

汎用ユーティリティ関数。

```javascript
import { clip, lerp, shuffle, sum } from "std:utils";
```

### 数学

| 関数 | 説明 |
|------|------|
| `clip(val, min, max)` | 範囲制限 |
| `lerp(a, b, t)` | 線形補間 |
| `rescale(val, inMin, inMax, outMin, outMax)` | 値の再スケール |
| `quantize(val, step)` | 量子化 |
| `wrap(val, min, max)` | ラップアラウンド |
| `sign(val)` | 符号（-1, 0, 1） |

### 配列操作

| 関数 | 説明 |
|------|------|
| `choice(arr)` | ランダム選択 |
| `shuffle(arr)` | シャッフル |
| `sum(arr)` | 合計 |
| `average(arr)` | 平均 |
| `normalize(arr)` | 正規化（0〜1） |
| `zip(arr1, arr2)` | ジップ |
| `rotate(arr, n)` | 回転 |
| `take(arr, n)` | 先頭n個 |
| `drop(arr, n)` | 先頭n個を除去 |
| `chunk(arr, n)` | チャンク分割 |
| `repeatPattern(pattern, n)` | パターン繰り返し |

### 音楽ユーティリティ

| 関数 | 説明 |
|------|------|
| `randomizeVel(base, variation)` | ベロシティランダム化 |

---

## 使用例

### 基本的な曲

```javascript
import { majorScale, majorTriad, QUARTER, EIGHTH } from "std:theory";
import { staccato } from "std:articulation";
import { arpeggio } from "std:ornaments";

title("Demo Song");
ppq(480);
tempo(120);
timeSig(4, 4);

export proc main() {
  track(midi, piano, {}) {
    const scale = majorScale(C4);
    forEach(scale, (p) => note(p, EIGHTH));

    const chord = majorTriad(C4);
    arpeggio(chord, QUARTER);

    staccato(E4, QUARTER, 80);
    staccato(G4, QUARTER, 80);
    staccato(C5, QUARTER, 80);
  }
}
```

### ジャズコード進行

```javascript
import { majorIIVI, firstInversion, WHOLE } from "std:theory";
import { walkingBass } from "std:notation";
import { jazzRide } from "std:genres";

export proc main() {
  track(midi, piano, {}) {
    const chords = majorIIVI(C4);
    forEach(chords, (ch) => chord(firstInversion(ch), WHOLE));
  }

  track(midi, bass, {}) {
    walkingBass(minorSeventh(D3), dominantSeventh(G3), QUARTER);
  }

  track(midi, drums, {}) {
    jazzRide(QUARTER, 4);
  }
}
```

### ダイナミクスと表現

```javascript
import { crescendo, swell } from "std:dynamics";
import { vibrato } from "std:expression";
import { WHOLE, HALF } from "std:theory";

export proc main() {
  track(midi, strings, {}) {
    // クレシェンドメロディ
    crescendoUniform([C4, E4, G4, C5], QUARTER, 60, 100);

    // ビブラート付きロングトーン
    vibrato(C5, WHOLE, 0.3, 5);

    // スウェル
    swell(G4, WHOLE, 50, 100, 16);
  }
}
```

### ジャンル別パターン

```javascript
import { bossaNovaGuitar, bossaNovaDrums } from "std:genres";
import { minorSeventh, QUARTER } from "std:theory";

export proc main() {
  track(midi, guitar, {}) {
    const am7 = minorSeventh(A3);
    bossaNovaGuitar(am7, QUARTER);
  }

  track(midi, drums, {}) {
    bossaNovaDrums(QUARTER, 4);
  }
}
```

### 作曲技法

```javascript
import { sequence, ostinato, variation } from "std:composition";
import { EIGHTH } from "std:theory";

export proc main() {
  track(midi, piano, {}) {
    const motif = [C4, D4, E4, G4];

    // シーケンス（上行）
    sequence(motif, [2, 4, 5], EIGHTH);

    // オスティナート
    ostinato(motif, EIGHTH, 4);

    // 変奏
    variation(motif, EIGHTH, "retrograde");
    variation(motif, EIGHTH, "invert");
  }
}
```

---

## 参照

- [ビルトイン関数](./BUILTINS.md) - 低レベル関数
