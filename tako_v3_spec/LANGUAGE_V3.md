# Tako v3 Language Specification (Implementation-Oriented / 確定版)

## 0. 規範語
- MUST / MUST NOT / SHOULD / MAY は RFC2119 の意味で用いる。

## 1. 設計目標（実装上の拘束）
1) **中立IR生成**: ソース評価の出力は `Score` 値（中立IR）である。  
2) **バックエンド非依存**: MIDI/MusicXML/DAW/ボーカル合成等は Renderer Plugin が担う。言語コアと std は backend を知らない。  
3) **決定性**: 同一ソース＋同一入力（seed等）→同一 `Score` を生成しなければならない。  
4) **DX**: formatter 前提の文法、静的検査（最低限 Pos/Dur 分離）を提供する。  
5) **サウンド割当の外部化**: 音色/声庫/キット等の具体指定は Render Profile に隔離する（言語/IRに含めない）。

## 2. ファイルとモジュール

### 2.1 拡張子
- ソース: `*.mf`
- Profile: `*.mf.profile.json`（規範）
- IR dump: `*.mf.score.json`（推奨）

### 2.2 import / export
- `export fn main() -> Score` は **MUST**。
- import は2種類:
  - `import { name } from "std:core";`
  - `import { foo } from "./foo.mf";`

### 2.3 名前解決（推奨順）
1. ローカルスコープ
2. 明示 import
3. std prelude（実装が提供する場合）
4. コア定義（Score/Clip など）

> 実装者メモ: ビルトインと std の同名衝突を避けるため、衝突しにくい設計を推奨する。
> 例: std 側は `std:vocal.*` のように module namespace を多用する。

## 3. 字句仕様（Lexer）

### 3.1 空白
- スペース、タブ、改行はトークン区切りに使用する。
- 改行は原則として意味を持たない（セミコロン/ブロックで区切る）。

### 3.2 コメント
- 行コメント: `// ...`
- ブロックコメント: `/* ... */`（ネストは MAY、実装が複雑なら禁止でよい）

### 3.3 予約語（最低限）
```
export import from
fn let const return
if else for in match
true false null
score clip track sound
meta tempo meter place role kind
```
実装は追加予約語を持ってもよいが、極力増やさないこと（DX）。

### 3.4 識別子
- `[A-Za-z_][A-Za-z0-9_]*` を規範とする。
- Unicode 識別子は MAY（実装コストが高い場合は不採用でよい）。

### 3.5 文字列
- ダブルクォート: `"..."`
- エスケープ: `\`, `\"`, `\n`, `\t`, `\r`, `\u{HEX+}`

### 3.6 数値
- Int: `0|[1-9][0-9]*`
- Float: `Int "." [0-9]+` など一般的形式

### 3.7 有理数（Rat）リテラル
v3 のコア時間は有理数を基盤とする。
- `Rat` は **式**として `a/b` で生成される（`Int / Int -> Rat`）。
- 実装は `1/4` を字句段階で Rat として扱ってもよい（SHOULD: 速度改善）。

### 3.8 Pitch リテラル
Pitch は 12-TET + cents を扱う。以下を規範とする:

- 基本: `C4`, `F#3`, `Bb5`
- cents: `C4+25c`, `A3-14c`

構文（正規表現例）:
- `^(A|B|C|D|E|F|G)(#|b)?(-?[0-9]+)([+-][0-9]+c)?$`

> 実装者メモ: enharmonic（# と b の同値）は Pitch 生成時に midi 値へ正規化する。

### 3.9 Duration リテラル（Dur）
Dur は内部的には `Rat`（whole-note=1）で表す。
実装は以下の糖衣を **SHOULD** 提供する（DX・可読性向上）:

- 文字サフィックス: `w h q e s t x`
  - `w=1`, `h=1/2`, `q=1/4`, `e=1/8`, `s=1/16`, `t=1/32`, `x=1/64`
- 付点: `q.`（1.5倍）
- 分数: `1/4`

> 注意: `t` は thirty-second の意。ticks ではない。ticks は v3 コアに存在しない。

### 3.10 BarBeat リテラル（PosRef 糖衣）
- `bar:beat`（両方 1-indexed）を PosRef として扱う。
  - 例: `1:1`, `2:3`
- v3 では tick 形式（`bar:beat:tick`）を **MUST NOT**（PPQ依存を復活させないため）。

## 4. 型システム（実装最小要件）

### 4.1 基本型
- `Int`, `Float`, `Bool`, `String`, `Array[T]`, `Map[K,V]`, `Option[T]`, `Result[T,E]`

### 4.2 音楽ドメイン型（必須）
- `Rat`（有理数）
- `Dur`（長さ）
- `Pos`（位置）
- `Pitch`
- `Clip`
- `Score`

### 4.3 Pos と Dur の分離（MUST）
- `Pos + Dur -> Pos`
- `Dur + Dur -> Dur`
- `Pos + Pos` は型エラー
- `Pos - Pos -> Dur` は提供してよい（SHOULD）

> 実装者メモ: 実行時表現は同じ Rat でも、型タグで区別する。

## 5. 実行モデル

### 5.1 エントリポイント
- プログラムは `export fn main() -> Score` を **MUST** 持つ。

### 5.2 決定性
- `main()` は副作用を持たない純粋評価で `Score` を返す。
- ランダムは `std:random` の `rng(seed)` を介して `Rng` 値を明示的に渡すこと（MUST）。
- 時刻/ネット/環境変数などの非決定入力は言語コアに存在しない（MUST NOT）。

## 6. 音楽DSL（score / clip）

### 6.1 score 式
`score { ... }` は `Score` 値を返す。内部は builder だが、外部からは不変値として見える。

#### 6.1.1 score セクション（規範）
- `meta { ... }`
- `tempo { ... }`
- `meter { ... }`
- `sound ... { ... }`
- `track ... { ... }`
- `marker ...`（MAY）

##### meta ブロック（例）
```
meta {
  title "Demo";
  artist "Someone";
}
```
- `title`, `artist` 等のフィールドは `String`。
- 未知フィールドは `meta.ext` に格納してもよい（MAY）。

##### tempo ブロック（例）
```
tempo {
  1:1 -> 120bpm;
  9:1 -> 90bpm @ q;
}
```
- `posRef -> bpm @ unit` を並べる。
- `@ unit` 省略時は `q`（四分）とみなす。

##### meter ブロック（例）
```
meter {
  1:1 -> 4/4;
  17:1 -> 3/4;
}
```

#### 6.1.2 sound 宣言（抽象サウンド）
sound は曲で使う音の「意味上の種類」を宣言する。
GM program、VST名、声庫名など具体指定は **Render Profile** に隔離するため、言語/IRに入れない（MUST NOT）。

例:
```
sound "piano" kind instrument {
  label "Piano";
  family "keyboard";
  range A0..C8;
}

sound "kit_standard" kind drumKit {
  drumKeys { kick; snare; hhc; hho; crash; ride; }
}

sound "lead_vocal" kind vocal {
  vocal {
    lang "ja-JP";
    range A3..E5;
  }
}
```

#### 6.1.3 track 宣言
Track は抽象サウンド（SoundId）を参照する。

例:
```
track "Piano" role Instrument sound "piano" {
  place 1:1 pianoPart();
}
```

- `role`: `Instrument | Drums | Vocal | Automation`
- `sound`: `sound` 宣言で定義した `SoundId`
- `place`: `PosRef` と `Clip` を受け取る

> MUST: `track.sound` が未宣言の SoundId を参照した場合はコンパイルエラー。

### 6.2 clip 式
`clip { ... }` は `Clip` 値を返す。clip ブロックは局所カーソル `cursor: Pos` を持ち、初期値は 0。

#### 6.2.1 clip ステートメント（必須セット）
- `at(pos)` : cursor を絶対位置へ
- `rest(dur)` : cursor += dur
- `note(pitch, dur, opts?)` : NoteEvent を追加し cursor += dur
- `chord([pitch...], dur, opts?)` : Chord/NoteEvent 群を追加し cursor += dur
- `hit(key, dur, opts?)` : DrumHitEvent を追加し cursor += dur
- `cc(num, value)` : ControlEvent（cursor は進めない）
- `automation(param, start, end, curve)` : AutomationEvent（cursorは進めない）
- `marker(kind, label)` : MarkerEvent（cursor）

opts（共通）:
- `vel: Float`（0..1 推奨）
- `voice: Int`
- `tech: [TechniqueId]`
- `lyric: LyricSpan`（NoteEvent のみ、MAY）

例:
```
clip {
  note(C4, q, vel: 0.7);
  rest(e);
  hit("kick", q, vel: 0.9);
}
```

## 7. 歌詞（vocal）コード規約（言語コア＋std:vocal の前提）

言語コアは “歌詞の実体” を強制しない。
歌詞の与え方は std:vocal の関数で統一する（SHOULD）。

### 7.1 最小推奨パターン（Text → align）
```
import * as vocal from "std:vocal";

fn vocalPart() -> Clip {
  let c = clip {
    note(C4, q);
    note(D4, q);
    note(E4, h);
  };

  const lyr = vocal.text("はじめまして", lang:"ja-JP");
  c = vocal.align(c, lyr, policy: BestEffort);

  return c;
}
```

### 7.2 シラブル（厳密）
```
const lyr = vocal.syllables(["は","じ","め"], lang:"ja-JP");
c = vocal.align(c, lyr, policy: Strict);
```

### 7.3 メリーシマ（伸ばし）
```
const lyr = vocal.syllables(["ま", vocal.ext(), vocal.ext(), "ま"], lang:"ja-JP");
```

### 7.4 音素（phoneme）
```
const ph = vocal.phonemes([["h","a"],["j","i"],["m","e"]], lang:"ja-JP", alphabet:"xsampa");
c = vocal.align(c, ph, policy: Strict);
```

## 8. EBNF（実装に必要な最低限）

> 注: これは “最小コア” の EBNF。式の優先順位や型注釈等は実装裁量で拡張してよい。
> formatter 前提とするため、曖昧な構文は避けること。

### 8.1 トップレベル
```
Program     ::= { ImportDecl | TopDecl } ;
ImportDecl  ::= "import" ImportSpec "from" StringLit ";" ;
ImportSpec  ::= "*" "as" Ident | "{" Ident { "," Ident } "}" ;
TopDecl     ::= "export"? ( FnDecl | ConstDecl ) ;

FnDecl      ::= "fn" Ident "(" ParamList? ")" ReturnType? Block ;
ConstDecl   ::= ("const"|"let") Ident ( ":" Type )? "=" Expr ";" ;

ParamList   ::= Param { "," Param } ;
Param       ::= Ident ( ":" Type )? ;
ReturnType  ::= "->" Type ;
Block       ::= "{" { Stmt } "}" ;
```

### 8.2 文
```
Stmt        ::= ConstDecl
              | ReturnStmt
              | IfStmt
              | ForStmt
              | ExprStmt
              ;

ReturnStmt  ::= "return" Expr? ";" ;
IfStmt      ::= "if" "(" Expr ")" Block ( "else" (IfStmt|Block) )? ;
ForStmt     ::= "for" "(" Ident "in" Expr ")" Block ;
ExprStmt    ::= Expr ";" ;
```

### 8.3 式（最小）
```
Expr        ::= ScoreExpr
              | ClipExpr
              | CallExpr
              | PrimaryExpr
              | BinaryExpr
              | MatchExpr
              ;

ScoreExpr   ::= "score" BlockScore ;
BlockScore  ::= "{" { ScoreItem } "}" ;

ScoreItem   ::= MetaBlock
              | TempoBlock
              | MeterBlock
              | SoundDecl
              | TrackDecl
              ;

MetaBlock   ::= "meta" "{" { MetaStmt } "}" ;
MetaStmt    ::= Ident StringLit ";" ;

TempoBlock  ::= "tempo" "{" { TempoStmt } "}" ;
TempoStmt   ::= PosRef "->" Number "bpm" ( "@" DurExpr )? ";" ;

MeterBlock  ::= "meter" "{" { MeterStmt } "}" ;
MeterStmt   ::= PosRef "->" Int "/" Int ";" ;

SoundDecl   ::= "sound" StringLit "kind" Ident "{" { SoundStmt } "}" ;
SoundStmt   ::= Ident ( StringLit | Ident | RangeLit | ArrayLit ) ";" 
              | "drumKeys" "{" { Ident ";" } "}"
              | "vocal" "{" { VocalStmt } "}" ;

TrackDecl   ::= "track" StringLit "role" Ident "sound" StringLit "{" { TrackStmt } "}" ;
TrackStmt   ::= "place" PosRef Expr ";" ;

ClipExpr    ::= "clip" BlockClip ;
BlockClip   ::= "{" { ClipStmt } "}" ;
ClipStmt    ::= "at" "(" DurExpr ")" ";"
              | "rest" "(" DurExpr ")" ";"
              | "note" "(" PitchExpr "," DurExpr ("," Opts)? ")" ";"
              | "chord" "(" ArrayPitch "," DurExpr ("," Opts)? ")" ";"
              | "hit" "(" StringLit "," DurExpr ("," Opts)? ")" ";"
              | "cc" "(" Int "," Int ")" ";"
              | "automation" "(" StringLit "," DurExpr "," DurExpr "," Expr ")" ";"
              | "marker" "(" StringLit "," StringLit ")" ";"
              ;

MatchExpr   ::= "match" "(" Expr ")" "{" { MatchArm } "}" ;
MatchArm    ::= ( "else" | Expr ) "->" Expr ";" ;
```

> 実装者メモ: `PosRef` と `DurExpr` の区別は型検査で行う。`bar:beat` は PosRef として lex/parse する。

## 9. 正規化（IR生成時の必須ルール）
評価結果の `Score` は、Renderer に渡す前に以下を満たすこと（MUST）。

1) **Placement.at は Pos(Rat) に解決**  
   - bar:beat は `meterMap` を用いて Pos に変換してから IR に格納する。

2) **tempoMap/meterMap の at は Pos(Rat)**  
3) **イベント時刻は Clip 先頭からの Pos(Rat)**  
4) **配列の順序**  
   - `Clip.events` は start 昇順に安定ソートすることを推奨（SHOULD）。

## 10. 診断（最低限）
実装は少なくとも以下の診断を提供すべき（SHOULD）。
- 未定義 SoundId
- meter/tempo の未設定（特に `1:1` を使う場合）
- `track.role` と `sound.kind` の不一致（warning）
- `clip` 内で負の duration/pos

---
