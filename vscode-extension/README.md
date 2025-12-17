# TakoMusic for VS Code

TakoMusic (.mf) ファイルのシンタックスハイライトとスニペットを提供するVS Code拡張機能です。

## Features

### Syntax Highlighting

- キーワード (`proc`, `const`, `let`, `if`, `else`, `for`, `import`, `export`)
- トラック定義 (`track`, `vocal`, `midi`)
- 組み込み関数 (`note`, `rest`, `chord`, `drum`, `tempo`, `timeSig`, etc.)
- ピッチリテラル (`C4`, `D#5`, `Bb3`)
- デュレーションリテラル (`1/4`, `1/8`, `3/8`)
- タイムリテラル (`1:1`, `2:3:240`)
- ドラム名 (`kick`, `snare`, `hhc`, `hho`, `tom1`, `crash`, `ride`)

### Snippets

| Prefix | Description |
|--------|-------------|
| `main` | Main entry point |
| `track-vocal` | Vocal track |
| `track-midi` | MIDI track |
| `track-drums` | Drum track |
| `note` | Note with lyric |
| `notem` | MIDI note |
| `chord` | Chord |
| `rest` | Rest |
| `drum` | Drum hit |
| `for` | For loop |
| `if` | If statement |
| `ife` | If-else statement |
| `proc` | Procedure |
| `eproc` | Export procedure |
| `imp` | Import |
| `at` | Set cursor position |
| `beat8` | 8-beat drum pattern |
| `song` | Basic song template |

## Installation

### From VSIX

```bash
code --install-extension takomusic-1.0.0.vsix
```

### From Marketplace

Search for "TakoMusic" in the VS Code Extensions view.

## Example

```mfs
export proc main() {
  title("Hello World");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  track(vocal, v1, { voice: "miku" }) {
    at(1:1);
    note(C4, 1/4, "ド");
    note(D4, 1/4, "レ");
    note(E4, 1/4, "ミ");
  }

  track(midi, drums, { ch: 10 }) {
    at(1:1);
    drum(kick, 1/4);
    drum(snare, 1/4);
  }
}
```

## Links

- [TakoMusic Website](https://music.takos.jp)
- [GitHub Repository](https://github.com/tako0614/takomusic)

## License

AGPL-3.0
