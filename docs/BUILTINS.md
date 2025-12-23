# TakoScore ビルトイン関数リファレンス

ビルトイン関数はランタイムに直接実装された低レベル関数です。
これらはIR（中間表現）操作やパフォーマンスクリティカルな処理に必要なため、
ネイティブコードで提供されています。

> **Note**: このドキュメントは TakoScore の **Procedural API** を説明しています。
> 宣言的構文（`score { }` ブロック）については [LANGUAGE.md](LANGUAGE.md) を参照してください。
> 両者は同じ IR にコンパイルされ、相互に組み合わせて使用できます。

高レベルな音楽機能は[標準モジュール](./STDLIB.md)を参照してください。

---

## 目次

1. [メタデータ](#メタデータ)
2. [音楽イベント](#音楽イベント)
3. [カーソル操作](#カーソル操作)
4. [MIDI CC](#midi-cc)
5. [配列操作](#配列操作)
6. [文字列操作](#文字列操作)
7. [数学関数](#数学関数)
8. [型変換](#型変換)
9. [ピッチ操作](#ピッチ操作)
10. [高階関数](#高階関数)
11. [アーティキュレーション](#アーティキュレーション)
12. [記譜法](#記譜法)
13. [反復記号](#反復記号)
14. [ダイナミクス](#ダイナミクス)
15. [オートメーション](#オートメーション)
16. [装飾音](#装飾音)

---

## メタデータ

### `title(name)`
曲のタイトルを設定します。

```javascript
title("My Song");
```

### `ppq(value)`
PPQ（Pulses Per Quarter note）を設定します。デフォルトは480。

```javascript
ppq(480);
```

### `tempo(bpm)`
テンポをBPMで設定します。

```javascript
tempo(120);
```

### `timeSig(numerator, denominator)`
拍子を設定します。

```javascript
timeSig(4, 4);  // 4/4拍子
timeSig(3, 4);  // 3/4拍子
```

---

## 音楽イベント

### `note(pitch, duration, [velocity])`
ノートを発音します。

```javascript
note(C4, q);             // C4を4分音符で（canonical）
note(C4, 1/4);           // C4を4分音符で（fraction notation）
note(E4, e, 100);        // E4を8分音符、ベロシティ100で
```

> **Duration formats**: `q` (canonical), `1/4` (fraction), `4n` (n-suffix), `480tk` (ticks). See [LANGUAGE.md](LANGUAGE.md#duration-notation) for details.

### `rest(duration)`
休符を挿入します。

```javascript
rest(1/4);  // 4分休符
```

### `chord(pitches, duration, [velocity])`
和音を発音します。

```javascript
chord([C4, E4, G4], 1/2);  // Cメジャーを2分音符で
```

### `drum(name, duration, [velocity])`
ドラムノートを発音します。

```javascript
drum(kick, q);
drum(snare, q, 110);
```

**ドラム名**: `kick`, `snare`, `hhc`, `hho`, `tom1`, `crash`, `ride`

### `track(type, instrument, options) { ... }`
トラックブロックを定義します。ブロック内のノートはこのトラックに出力されます。

```javascript
track(midi, piano, { ch: 1, program: 0 }) {
  note(C4, q);
  note(E4, q);
}

track(midi, drums, { ch: 10 }) {
  drum(kick, q);
  drum(snare, q);
}
```

**パラメータ**:
- `type`: `midi` または `vocal`
- `instrument`: 楽器名（任意の識別子）
- `options`: `{ ch: MIDIチャンネル, program: GMプログラム番号 }`

> **Note**: `track()` は Procedural API 専用です。宣言的構文では `part` ブロックを使用してください。

---

## カーソル操作

### `at(time)`
カーソルを指定時間に移動します。時間は `bar:beat` 形式で、両方とも **1-indexed** です。

```javascript
at(1:1);      // 1小節目1拍目（最初の小節の最初の拍）
at(2:3:240);  // 2小節目3拍目、+240tick
```

> **Note**: bar と beat は両方 1-indexed（楽譜表記と同じ）。tick は beat 内で 0-indexed。

### `atTick(tick)`
カーソルを指定tickに移動します。

```javascript
atTick(1920);  // 1920tickの位置へ
```

### `advance(duration)`
カーソルを指定時間分進めます。

```javascript
advance(1/4);  // 4分音符分進める
```

### `advanceTick(ticks)`
カーソルを指定tick分進めます。

```javascript
advanceTick(480);  // 480tick進める
```

### `cursor()`
現在のカーソル位置（tick）を取得します。

```javascript
const pos = cursor();
```

---

## MIDI CC

### `cc(controller, value)`
コントロールチェンジを送信します。

```javascript
cc(1, 64);   // モジュレーション
cc(11, 100); // エクスプレッション
```

### `expression(value)`
エクスプレッション（CC#11）を設定します。

```javascript
expression(100);
```

### `volume(value)`
ボリューム（CC#7）を設定します。

```javascript
volume(100);
```

### `pan(value)`
パン（CC#10）を設定します。0=左、64=中央、127=右。

```javascript
pan(64);  // センター
```

### `sustain(on)`
サステインペダル（CC#64）を設定します。

```javascript
sustain(true);   // ペダルオン
sustain(false);  // ペダルオフ
```

### `pitchBend(value)`
ピッチベンドを設定します。-8192〜8191。

```javascript
pitchBend(0);      // 中央
pitchBend(4096);   // 上方向
```

### `modulation(value)`
モジュレーション（CC#1）を設定します。

```javascript
modulation(64);
```

### `aftertouch(value)`
チャンネルアフタータッチを設定します。

```javascript
aftertouch(64);
```

### `polyAftertouch(pitch, value)`
ポリフォニックアフタータッチを設定します。

```javascript
polyAftertouch(C4, 64);
```

### `nrpn(paramMSB, paramLSB, valueMSB, [valueLSB])`
NRPNメッセージを送信します。

```javascript
nrpn(0, 1, 64);      // NRPN parameter 0:1, value MSB = 64
nrpn(0, 1, 64, 0);   // With value LSB
```

### `rpn(paramMSB, paramLSB, valueMSB)`
RPNメッセージを送信します。

```javascript
rpn(0, 0, 2);  // Pitch bend sensitivity = 2 semitones
```

### `sysex(bytes)`
SysExメッセージを送信します。

```javascript
sysex([0x7E, 0x7F, 0x09, 0x01]);  // GM System On
```

### `tempoCurve(startBpm, endBpm, duration, [curveType])`
テンポカーブを設定します。

```javascript
tempoCurve(120, 80, 4n, "linear");
```

---

## 配列操作

### `len(array)`
配列または文字列の長さを返します。

```javascript
len([1, 2, 3]);  // 3
len("hello");   // 5
```

### `push(array, value)`
配列に要素を追加します（破壊的）。

```javascript
let arr = [1, 2];
push(arr, 3);  // [1, 2, 3]
```

### `pop(array)`
配列の最後の要素を削除して返します（破壊的）。

```javascript
let arr = [1, 2, 3];
pop(arr);  // 3, arrは[1, 2]
```

### `slice(array, start, [end])`
配列の一部を新しい配列として返します。

```javascript
slice([1, 2, 3, 4], 1, 3);  // [2, 3]
```

### `concat(array1, array2)`
2つの配列を連結した新しい配列を返します。

```javascript
concat([1, 2], [3, 4]);  // [1, 2, 3, 4]
```

### `reverse(array)`
配列を反転します（破壊的）。

```javascript
reverse([1, 2, 3]);  // [3, 2, 1]
```

### `copy(array)`
配列のシャローコピーを作成します。

```javascript
const arr2 = copy(arr1);
```

### `fill(size, value)`
指定サイズの配列を値で埋めて作成します。

```javascript
fill(5, 0);  // [0, 0, 0, 0, 0]
```

---

## 文字列操作

### `split(string, delimiter)`
文字列を区切り文字で分割します。

```javascript
split("a,b,c", ",");  // ["a", "b", "c"]
```

### `join(array, delimiter)`
配列を区切り文字で連結します。

```javascript
join(["a", "b", "c"], "-");  // "a-b-c"
```

### `substr(string, start, [length])`
部分文字列を取得します。

```javascript
substr("hello", 1, 3);  // "ell"
```

### `indexOf(string, search)`
文字列内の位置を検索します。見つからない場合は-1。

```javascript
indexOf("hello", "ll");  // 2
```

### `replace(string, search, replacement)`
文字列を置換します。

```javascript
replace("hello", "l", "r");  // "herlo"
```

### `trim(string)`
前後の空白を削除します。

```javascript
trim("  hello  ");  // "hello"
```

### `upper(string)` / `lower(string)`
大文字/小文字に変換します。

```javascript
upper("hello");  // "HELLO"
lower("HELLO");  // "hello"
```

### `startsWith(string, prefix)` / `endsWith(string, suffix)`
前方/後方一致を判定します。

```javascript
startsWith("hello", "he");  // true
endsWith("hello", "lo");    // true
```

### `contains(string, substr)`
部分文字列を含むか判定します。

```javascript
contains("hello", "ell");  // true
```

### `repeat(string, count)`
文字列を繰り返します。

```javascript
repeat("ab", 3);  // "ababab"
```

### `charAt(string, index)`
指定位置の文字を取得します。

```javascript
charAt("hello", 1);  // "e"
```

### `charCodeAt(string, index)`
指定位置の文字コードを取得します。

```javascript
charCodeAt("A", 0);  // 65
```

### `fromCharCode(code)`
文字コードから文字を生成します。

```javascript
fromCharCode(65);  // "A"
```

### `padStart(string, length, [padString])` / `padEnd(string, length, [padString])`
文字列をパディングします。

```javascript
padStart("5", 3, "0");  // "005"
padEnd("5", 3, "0");    // "500"
```

---

## 数学関数

### `floor(value)` / `ceil(value)`
切り捨て/切り上げ。

```javascript
floor(3.7);  // 3
ceil(3.2);   // 4
```

### `abs(value)`
絶対値。

```javascript
abs(-5);  // 5
```

### `min(a, b, ...)` / `max(a, b, ...)`
最小値/最大値。

```javascript
min(3, 1, 4);  // 1
max(3, 1, 4);  // 4
```

### `random()` / `random(max)` / `random(min, max)`
乱数を生成します。

```javascript
random();        // 0.0〜1.0のfloat
random(10);      // 0〜9のint
random(5, 10);   // 5〜9のint
```

---

## 型変換

### `int(value)`
整数に変換します。

```javascript
int(3.7);    // 3
int("42");   // 42
```

### `float(value)`
浮動小数点に変換します。

```javascript
float(3);      // 3.0
float("3.14"); // 3.14
```

### `string(value)`
文字列に変換します。

```javascript
string(42);  // "42"
```

### `bool(value)`
真偽値に変換します。

```javascript
bool(1);   // true
bool(0);   // false
bool("");  // false
```

---

## ピッチ操作

### `transpose(pitch, semitones)`
ピッチを半音単位で移調します。

```javascript
transpose(C4, 7);   // G4
transpose(C4, -12); // C3
```

### `midiPitch(midiNumber)`
MIDIノート番号からピッチを作成します。

```javascript
midiPitch(60);  // C4
```

### `pitchMidi(pitch)`
ピッチからMIDIノート番号を取得します。

```javascript
pitchMidi(C4);  // 60
```

### `durToTicks(duration)`
デュレーションをtickに変換します。

```javascript
durToTicks(1/4);  // 480 (ppq=480の場合)
```

### `getPpq()`
現在のPPQを取得します。

```javascript
const ppq = getPpq();  // 480
```

---

## 高階関数

### `map(array, fn)`
各要素に関数を適用した新しい配列を返します。

```javascript
map([1, 2, 3], (x) => x * 2);  // [2, 4, 6]
```

### `filter(array, fn)`
条件を満たす要素の新しい配列を返します。

```javascript
filter([1, 2, 3, 4], (x) => x % 2 == 0);  // [2, 4]
```

### `reduce(array, fn, initial)`
配列を単一の値に畳み込みます。

```javascript
reduce([1, 2, 3], (acc, x) => acc + x, 0);  // 6
```

### `find(array, fn)`
条件を満たす最初の要素を返します。

```javascript
find([1, 2, 3], (x) => x > 1);  // 2
```

### `findIndex(array, fn)`
条件を満たす最初の要素のインデックスを返します。

```javascript
findIndex([1, 2, 3], (x) => x > 1);  // 1
```

### `some(array, fn)`
いずれかの要素が条件を満たすか判定します。

```javascript
some([1, 2, 3], (x) => x > 2);  // true
```

### `every(array, fn)`
すべての要素が条件を満たすか判定します。

```javascript
every([1, 2, 3], (x) => x > 0);  // true
```

### `includes(array, value)`
配列が値を含むか判定します。

```javascript
includes([1, 2, 3], 2);  // true
```

### `flat(array, [depth])`
配列を平坦化します。

```javascript
flat([[1, 2], [3, 4]]);     // [1, 2, 3, 4]
flat([[[1]], [[2]]], 2);    // [1, 2]
```

### `flatMap(array, fn)`
mapしてからflatします。

```javascript
flatMap([1, 2], (x) => [x, x * 2]);  // [1, 2, 2, 4]
```

### `forEach(array, fn)`
各要素に対して関数を実行します。

```javascript
forEach([1, 2, 3], (x) => print(x));
```

### `sort(array, [compareFn])`
配列をソートします（破壊的）。

```javascript
sort([3, 1, 2]);  // [1, 2, 3]
sort([3, 1, 2], (a, b) => b - a);  // [3, 2, 1]
```

### `range(end)` / `range(start, end)` / `range(start, end, step)`
数値の配列を生成します。

```javascript
range(5);         // [0, 1, 2, 3, 4]
range(2, 5);      // [2, 3, 4]
range(0, 10, 2);  // [0, 2, 4, 6, 8]
```

---

## 補助関数

### `print(...values)`
デバッグ出力を行います。

```javascript
print("Debug:", value);
```

### `noteAt(tick, pitch, durTicks, [velocity])`
指定tickにノートを配置します（カーソルを移動しない）。

```javascript
noteAt(0, C4, 480, 100);
```

---

## アーティキュレーション

### `staccato(pitch, dur, [vel])`
スタッカート（短く切って演奏）。

```javascript
staccato(C4, 4n, 80);
```

### `legato(pitch, dur, [vel])`
レガート（滑らかに繋げる）。

```javascript
legato(C4, 4n, 80);
```

### `accent(pitch, dur, [vel])`
アクセント（強調）。

```javascript
accent(C4, 4n, 80);
```

### `tenuto(pitch, dur, [vel])`
テヌート（十分に保持）。

```javascript
tenuto(C4, 4n, 80);
```

### `marcato(pitch, dur, [vel])`
マルカート（強いアクセント）。

```javascript
marcato(C4, 4n, 80);
```

---

## 記譜法

### `tuplet(ratio, totalDur)`
連符を開始します。

```javascript
tuplet(3, 4n);  // 3連符
```

### `tupletEnd()`
連符を終了します。

```javascript
tupletEnd();
```

### `triplet(notes, dur)`
3連符を作成します。

```javascript
triplet([C4, D4, E4], 4n);
```

### `grace(pitch, dur)`
装飾音（前打音）。

```javascript
grace(D4, 16n);
note(C4, 4n);
```

### `acciaccatura(pitch, dur)`
アチャッカトゥーラ（短前打音）。

```javascript
acciaccatura(D4, 16n);
note(C4, 4n);
```

### `appoggiatura(pitch, dur)`
アポジャトゥーラ（長前打音）。

```javascript
appoggiatura(D4, 8n);
note(C4, 4n);
```

### `fermata([multiplier])`
フェルマータ（延長記号）。

```javascript
fermata(1.5);  // 1.5倍延長
```

### `slurStart()`
スラーを開始します。

```javascript
slurStart();
note(C4, 4n);
note(D4, 4n);
slurEnd();
```

### `slurEnd()`
スラーを終了します。

### `tie(pitch, dur)`
タイ（同音を繋げる）。

```javascript
note(C4, 4n);
tie(C4, 4n);
```

### `ottava(shift)`
オッターヴァ記号（8va, 8vb等）。

```javascript
ottava(1);   // 8va (1オクターブ上)
ottava(-1);  // 8vb (1オクターブ下)
```

### `ottavaEnd()`
オッターヴァを終了します。

### `voice(number)`
ボイス（声部）を切り替えます。

```javascript
voice(1);  // 第1声部
note(C4, 4n);
voice(2);  // 第2声部
note(G3, 4n);
```

---

## 反復記号

### `repeatStart()`
反復開始記号。

### `repeatEnd([times])`
反復終了記号。

```javascript
repeatEnd(2);  // 2回繰り返し
```

### `dc()` / `ds()` / `fine()` / `coda()` / `segno()` / `toCoda()`
ダ・カーポ、ダル・セーニョなどの反復記号。

```javascript
segno();
// ... music ...
ds();  // Dal Segno
```

---

## ダイナミクス

### `dynamic(marking)`
ダイナミクス記号を設定します。

```javascript
dynamic("ff");   // フォルティッシモ
dynamic("pp");   // ピアニッシモ
```

### `crescendo(startVel, endVel, dur)`
クレシェンド。

```javascript
crescendo(60, 100, 2n);
```

### `decrescendo(startVel, endVel, dur)`
デクレシェンド。

```javascript
decrescendo(100, 60, 2n);
```

---

## オートメーション

### `ccCurve(controller, startVal, endVal, dur, [curveType])`
CCカーブを作成します。

```javascript
ccCurve(11, 0, 127, 2n, "linear");
```

### `expressionCurve(startVal, endVal, dur, [curveType])`
エクスプレッションカーブを作成します。

```javascript
expressionCurve(50, 100, 4n);
```

### `pitchBendCurve(startVal, endVal, dur, [curveType])`
ピッチベンドカーブを作成します。

```javascript
pitchBendCurve(0, 4096, 4n, "exponential");
```

---

## 装飾音

### `trill(pitch, dur, [interval])`
トリル。

```javascript
trill(C4, 4n, 2);  // 2半音上とのトリル
```

### `mordent(pitch, dur, [interval])`
モルデント。

```javascript
mordent(C4, 4n);
```

### `tremolo(pitch, dur, [rate])`
トレモロ。

```javascript
tremolo(C4, 2n, 32n);
```

### `arpeggio(pitches, dur)`
アルペジオ。

```javascript
arpeggio([C4, E4, G4], 4n);
```

### `glissando(startPitch, endPitch, dur)`
グリッサンド。

```javascript
glissando(C4, C5, 4n);
```

---

## 参照

- [標準モジュール](./STDLIB.md) - 高レベルな音楽機能
- [言語リファレンス](./LANGUAGE.md) - 言語仕様
