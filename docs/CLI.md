# TakoMusic CLI Reference

The `mf` command-line interface provides tools for checking, building, and developing TakoMusic compositions.

## Installation

```bash
npm install -g takomusic
```

Or use locally:

```bash
npx mf <command>
```

## Commands

### mf check

Check a TakoMusic file for errors without generating output.

```bash
mf check <file.mf>
```

**Options:**
- No additional options

**Example:**
```bash
mf check mycomposition.mf
```

**Output:**
- Success: "Check passed: mycomposition.mf"
- Errors: Rust-style error messages with source snippets

### mf build

Build a TakoMusic file and generate Score IR (JSON).

```bash
mf build <file.mf> [--output <path>]
```

**Options:**
- `--output, -o <path>` - Output file path (default: `<input>.score.json`)

**Example:**
```bash
mf build song.mf
mf build song.mf -o output/song.json
```

### mf repl

Start an interactive Read-Eval-Print Loop session.

```bash
mf repl
```

**REPL Commands:**
| Command | Description |
|---------|-------------|
| `.help` | Show available commands |
| `.clear` | Clear the screen |
| `.reset` | Reset session (clear all variables) |
| `.vars` | List defined variables and their values |
| `.history` | Show command history |
| `.load <file>` | Load and execute a .mf file |
| `.exit` | Exit the REPL |

**Features:**
- Multi-line input (auto-detected by open braces)
- Tab completion for keywords
- Command history navigation with arrow keys
- Define variables with `const` and `let`
- Define functions with `fn`

**Example session:**
```
mf> const x = 42
42
mf> fn double(n) { return n * 2; }
<fn double>
mf> double(x)
84
mf> .vars
x = 42
double = <fn>
```

### mf watch

Watch files for changes and automatically check or build.

```bash
mf watch <file.mf> [--build]
```

**Options:**
- `--build, -b` - Build on change (default: check only)
- `--debounce <ms>` - Debounce delay in milliseconds (default: 300)

**Example:**
```bash
mf watch myfile.mf          # Check on every save
mf watch myfile.mf --build  # Build on every save
```

### mf lsp

Start the Language Server Protocol server for IDE integration.

```bash
mf lsp
```

**Usage:**
This command is typically called automatically by IDE extensions. It communicates via stdin/stdout using the LSP protocol.

**Capabilities:**
- Real-time diagnostics
- Hover information
- Code completion
- Document symbols

### mf fmt

Format TakoMusic source files.

```bash
mf fmt <file.mf> [--check]
```

**Options:**
- `--check` - Check formatting without modifying files (for CI)

**Example:**
```bash
mf fmt myfile.mf         # Format in place
mf fmt myfile.mf --check # Check only (exit code 1 if not formatted)
```

### mf install

Manage external packages from URLs.

```bash
mf install <url>
mf install --list
mf install --remove <url>
mf install --verify
mf install --update
```

**Options:**
- `<url>` - Install package from URL
- `--list, -l` - List installed packages
- `--remove, -r <url>` - Remove a package
- `--verify` - Verify package integrity (SHA256)
- `--update` - Update all packages

**URL formats:**
```bash
# Full HTTPS URL
mf install https://example.com/lib/utils.mf

# GitHub shorthand
mf install github.com/user/repo/path/file.mf

# GitLab shorthand
mf install gitlab.com/user/repo/path/file.mf
```

**Package storage:**
- Cache directory: `.mf_cache/`
- Lock file: `mf.lock` (with SHA256 hashes)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MF_NO_COLOR` | Disable colored output | (unset) |
| `MF_CACHE_DIR` | Package cache directory | `.mf_cache` |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Compilation error |
| 2 | File not found |
| 3 | Invalid arguments |

## Error Messages

TakoMusic provides Rust-style error messages with source context:

```
error[E110]: Pitch out of range
  --> song.mf:15:12
   |
15 |     note(Z9, q);
   |          ^^ MIDI pitch 132 exceeds 127
   |
   = help: Valid range is 0-127
```

### "Did you mean?" Suggestions

When you reference an undefined symbol, TakoMusic suggests similar names:

```
error: Undefined symbol: notee
  --> song.mf:8:5
   |
 8 |     notee(C4, q);
   |     ^^^^^
   |
   = help: Did you mean: note?
```

## Renderer CLIs

After building a Score IR, use renderer plugins to generate output:

### tako-render-midi

Convert Score IR to Standard MIDI File.

```bash
tako-render-midi <score.json> <profile.json> [output.mid]
```

### tako-render-musicxml

Convert Score IR to MusicXML.

```bash
tako-render-musicxml <score.json> <profile.json> [output.xml]
```

### tako-render-lilypond

Convert Score IR to Lilypond notation.

```bash
tako-render-lilypond <score.json> <profile.json> [output.ly]
```

Then generate PDF:
```bash
lilypond output.ly
```

## Examples

### Complete workflow

```bash
# 1. Create a composition
echo 'export fn main() -> Score { ... }' > song.mf

# 2. Check for errors during development
mf watch song.mf

# 3. Build when ready
mf build song.mf

# 4. Render to MIDI
tako-render-midi song.mf.score.json profiles/midi.mf.profile.json song.mid
```

### Format before commit

```bash
# Format all .mf files
for f in *.mf; do mf fmt "$f"; done

# Or use --check in CI
mf fmt src/main.mf --check
```

### Interactive experimentation

```bash
mf repl
mf> import { majorTriad } from "std:theory"
mf> majorTriad(C4)
[C4, E4, G4]
mf> .exit
```
