# Rendering (Profiles + Plugins)

Tako v3 rendering uses Render Profiles and external renderer plugins. The compiler only emits
neutral `Score` IR; output formats are produced by plugins.

## Render Profiles

Render Profiles are JSON files (`*.mf.profile.json`) that bind abstract sounds to a renderer.

Required fields:

- `tako.profileVersion` (must be `1`)
- `profileName`
- `renderer` (plugin id)
- `output` (plugin-specific)
- `bindings` (non-empty array)

Optional fields:

- `degradePolicy`: `Error` | `Drop` | `Approx`

Binding entries:

- `selector`: at least one of `trackName`, `sound`, or `role`
- `config`: plugin-specific object

### Selector Matching Rules

**AND semantics:** When a selector specifies multiple fields, ALL specified fields must match (conjunction/AND). Unspecified fields act as wildcards.

| Selector | Matches |
|----------|---------|
| `{ "trackName": "Piano" }` | Track named "Piano" (any sound, any role) |
| `{ "sound": "piano" }` | Any track using sound "piano" |
| `{ "role": "Vocal" }` | Any track with role Vocal |
| `{ "trackName": "Lead", "role": "Vocal" }` | Track named "Lead" AND role Vocal |
| `{ "sound": "synth", "role": "Instrument" }` | Sound "synth" AND role Instrument |

### Binding Resolution Algorithm

The host MUST resolve bindings using the following algorithm:

```
function resolveBinding(track, bindings):
  for binding in bindings:  // in array order
    if matches(track, binding.selector):
      return binding.config
  return null  // unbound

function matches(track, selector):
  if selector.trackName is set AND track.name != selector.trackName:
    return false
  if selector.sound is set AND track.sound != selector.sound:
    return false
  if selector.role is set AND track.role != selector.role:
    return false
  return true
```

**Key points:**

1. Bindings are evaluated in array order (first match wins)
2. All specified selector fields must match (AND)
3. Omitted fields match any value (wildcard)
4. More specific selectors should appear earlier in the array

### Unbound Track Handling

When a track has no matching binding:

| `degradePolicy` | Behavior |
|-----------------|----------|
| `Error` (default) | Validation fails with an error diagnostic |
| `Drop` | Track is silently omitted from output with a warning |
| `Approx` | Host attempts fallback (e.g., default config) with a warning |

**Plugins MUST:**
- Report unbound tracks during `validate`
- Apply `degradePolicy` during `render`

**Example diagnostic for unbound track:**

```json
{
  "level": "error",
  "code": "UNBOUND_TRACK",
  "message": "No binding found for track 'Strings'",
  "location": { "trackName": "Strings" }
}
```

Schema:

- `docs/schemas/PROFILE_V3.schema.json`

## Renderer Plugin Protocol (v1)

Plugins are CLI executables. The host invokes:

- `<plugin> capabilities`
- `<plugin> validate --score <score.json> --profile <profile.json>`
- `<plugin> render --score <score.json> --profile <profile.json>`

### capabilities

Returns a JSON object with at least:

- `protocolVersion` (must be `1`)
- `id` (must match `profile.renderer`)

Common optional fields:

- `supportedRoles`
- `supportedEvents`
- `lyricSupport`
- `paramSupport`
- `degradeDefaults`

### validate

Returns a JSON array of diagnostics:

- `level`: `error` | `warning` | `info`
- `code` (optional)
- `message`
- `location` (optional): `trackName`, `placementIndex`, `eventIndex`, `pos`

Plugins SHOULD check:

- binding resolution for all tracks
- drum key mappings for `drumKit`
- unsupported params/techniques (using degrade policy)
- target format constraints (pitch/time range, etc.)
- lyric requirements (for vocal renderers)

### render

Returns a JSON array of artifacts:

- `kind`: `file` | `dir` | `bundle` | `stream`
- `path` (optional for `file`/`dir`/`bundle`; not used for `stream`)
- `mediaType` (optional)
- `description` (optional)

**Artifact Kinds:**

| Kind | Description | `path` field |
|------|-------------|--------------|
| `file` | Single output file | Required: absolute path to file |
| `dir` | Directory of files | Required: absolute path to directory |
| `bundle` | Archive file (zip, tar, etc.) | Required: absolute path to archive |
| `stream` | Data written to stdout | Not used |

**Stream Protocol (v1):**

When `kind: "stream"` is returned:

1. The plugin writes binary data directly to stdout
2. The host captures stdout as the artifact content
3. `mediaType` SHOULD be specified (e.g., `"audio/wav"`, `"audio/midi"`)
4. Stderr is used for logging/diagnostics (JSON lines recommended)
5. Exit code 0 indicates success; non-zero indicates failure

**Example artifacts:**

```json
[
  { "kind": "file", "path": "/tmp/output.mid", "mediaType": "audio/midi" },
  { "kind": "dir", "path": "/tmp/stems/", "description": "Individual stem files" }
]
```

```json
[
  { "kind": "stream", "mediaType": "audio/wav", "description": "Rendered audio" }
]
```

**Note:** For v1, prefer `file` artifacts over `stream` for better tooling compatibility. `stream` is intended for pipeline use cases where immediate output is needed.

## Degrade Policy Guidance

- `Error`: fail on unsupported data
- `Drop`: omit unsupported data with warnings
- `Approx`: approximate unsupported data with warnings
