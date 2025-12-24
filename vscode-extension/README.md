# TakoMusic for VS Code

TakoMusic (.mf) ファイルのシンタックスハイライトとスニペットを提供するVS Code拡張機能です。

> Note: Syntax support is being updated for v3. The authoritative spec is `../tako_v3_spec/`.

## Features

### Syntax Highlighting

- キーワード (`fn`, `const`, `let`, `if`, `else`, `for`, `import`, `export`)
- スコアDSL (`score`, `clip`, `sound`, `track`, `meta`, `tempo`, `meter`, `place`, `role`, `kind`)
- 組み込み関数 (`note`, `rest`, `chord`, `hit`, `at`, `cc`, `automation`, `marker`)
- ピッチリテラル (`C4`, `D#5`, `Bb3`)
- デュレーションリテラル (`w`, `h`, `q`, `e`, `s`, `t`, `x`, `1/4`)
- タイムリテラル (`1:1`, `2:3`)
- ドラム名 (`kick`, `snare`, `hhc`, `hho`, `tom1`, `crash`, `ride`)

### Snippets (v3 target)

| Prefix | Description |
|--------|-------------|
| `main` | Entry point with `score` |
| `score` | Score block |
| `clip` | Clip block |
| `sound` | Sound declaration |
| `track` | Track declaration |
| `note` | Note event |
| `chord` | Chord |
| `rest` | Rest |
| `hit` | Drum hit |
| `for` | For loop |
| `if` | If statement |
| `imp` | Import |
| `tempo` | Tempo block |
| `meter` | Meter block |

## Installation

### From VSIX

```bash
code --install-extension takomusic-1.0.0.vsix
```

### From Marketplace

Search for "TakoMusic" in the VS Code Extensions view.

## Example

```tako
export fn main() -> Score {
  return score {
    meta { title "Hello v3"; }
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "kit_standard" kind drumKit {
      drumKeys { kick; snare; hhc; hho; crash; ride; }
    }

    track "Drums" role Drums sound "kit_standard" {
      place 1:1 clip {
        hit("kick", q);
        hit("snare", q);
      };
    }
  };
}
```

## Links

- [TakoMusic Website](https://music.takos.jp)
- [GitHub Repository](https://github.com/tako0614/takomusic)

## License

AGPL-3.0
