# TakoMusic for VS Code

VS Code language support for TakoMusic v3 (.mf files).

## Features

- Syntax highlighting for v3 keywords, score/clip blocks, literals, and std modules
- Snippets for common v3 structures and events
- Diagnostics are not implemented for v3 yet

## Snippets

| Prefix | Description |
|--------|-------------|
| `main` | Entry point with `score` |
| `score` | Score block |
| `sound` | Sound declaration |
| `track` | Track declaration |
| `clip` | Clip block |
| `note` | Note event |
| `chord` | Chord event |
| `hit` | Drum hit |
| `rest` | Rest event |
| `imp` | Import |
| `imp-std` | Import from `std:` |
| `tempo` | Tempo block |
| `meter` | Meter block |

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

## Installation

### From VSIX

```bash
code --install-extension takomusic-1.1.0.vsix
```

### From Marketplace

Search for "TakoMusic" in the VS Code Extensions view.

## Links

- [TakoMusic Website](https://music.takos.jp)
- [GitHub Repository](https://github.com/tako0614/takomusic)

## License

AGPL-3.0
