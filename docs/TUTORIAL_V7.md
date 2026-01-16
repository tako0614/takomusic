# TakoMusic v7 Tutorial

This guide walks through the v7 workflow: writing code, using the web app, AI tools, collaboration, rendering, and VSCode features.

## 1) Quick Start

Create a file `src/main.mf`:

```mf
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }

    sound "piano" kind instrument { range A0..C8; }

    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q, vel: 0.7);
        note(E4, q, vel: 0.7);
        note(G4, q, vel: 0.7);
        note(C5, q, vel: 0.7);
      };
    }
  };
}
```

Compile:

```bash
mf build src/main.mf
```

## 2) Web Playground

- Sign in with a simple username.
- Save or load projects (local storage).
- Click **Compile** to view IR/AST.
- Click **Play** to hear the score.
- Click **MIDI** to download a MIDI file.

## 3) AI Tools (Web)

Use the AI panel:

- **Compose**: Describe the mood and instrumentation.
- **Explain**: Explain the full code or a selection.
- **Chat**: Ask about form, harmony, or improvements.
- **Inline**: Place the cursor and insert a continuation.
- **Agent**: Describe edits to apply to the current code.

Set the AI endpoint in the web app via:

```
VITE_TAKOMUSIC_AI_URL=http://localhost:8787/api/ai
```

## 4) Collaboration (Web)

Collab uses WebSocket + Yjs.

- Choose a room name.
- Click **Connect**.
- Share the room name with collaborators.

Set the collab endpoint:

```
VITE_TAKOMUSIC_COLLAB_URL=ws://localhost:8787
```

## 5) VSCode Extension

Features:

- LSP diagnostics, hover, completion, format, code actions.

No additional commands are required.

## 6) Server Audio Export

Server-side audio export uses the renderer plugin:

- `tools/tako-render-audio/index.js`
- profile: `profiles/audio.mf.profile.json`

API endpoints:

- `POST /api/exports/audio` (score payload)
- `GET /api/exports/{id}` (download)

## 7) Tips

- Use small motifs and combine with `repeat`, `concat`, and `merge`.
- Use `std:autogen` for basslines and accompaniment.
- Keep AI prompts concise and specify tempo and instruments.
