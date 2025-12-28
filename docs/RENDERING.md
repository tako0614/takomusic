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

### Default/Fallback Bindings

Since selectors require at least one field, a true "catch-all" binding isn't possible. Use role-based fallbacks instead:

**Recommended pattern — role-based defaults at the end:**

```json
{
  "bindings": [
    { "selector": { "trackName": "Lead Vocal" }, "config": { ... } },
    { "selector": { "sound": "piano" }, "config": { ... } },
    { "selector": { "role": "Instrument" }, "config": { "defaultInstrument": true } },
    { "selector": { "role": "Drums" }, "config": { "defaultDrums": true } },
    { "selector": { "role": "Vocal" }, "config": { "defaultVocal": true } },
    { "selector": { "role": "Automation" }, "config": { "defaultAutomation": true } }
  ]
}
```

This pattern:
- Specific bindings (by name or sound) match first
- Role-based fallbacks catch remaining tracks
- All standard roles are covered, preventing unbound tracks

**Alternative — use `degradePolicy: "Approx"` for unbound tracks:**

If the plugin supports `Approx` for unbound tracks, it will use internal defaults:

```json
{
  "degradePolicy": "Approx",
  "bindings": [
    { "selector": { "sound": "piano" }, "config": { ... } }
  ]
}
```

Tracks not matching any binding will use the plugin's default configuration.

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

### Policy Priority and Scope

Degrade policies are resolved in the following order (highest priority first):

1. **Profile-level `degradePolicy`** — applies to all categories unless overridden
2. **Plugin `degradeDefaults`** — per-category defaults from plugin capabilities
3. **Built-in default** — `Error` if nothing else specified

**Resolution table:**

| Scenario | Policy Source |
|----------|---------------|
| Unknown technique | Profile `degradePolicy` > Plugin `degradeDefaults.unknownTechnique` > `Error` |
| Unknown automation param | Profile `degradePolicy` > Plugin `degradeDefaults.unknownParam` > `Error` |
| Unbound track | Profile `degradePolicy` > Plugin `degradeDefaults.unboundTrack` > `Error` |
| Unsupported event type | Profile `degradePolicy` > `Error` |
| Out-of-range pitch/time | Profile `degradePolicy` > `Error` |

**Example:**

```json
{
  "profileName": "MyProfile",
  "renderer": "example-renderer",
  "degradePolicy": "Drop",
  "bindings": [...]
}
```

With this profile:
- Unknown techniques → `Drop` (from profile)
- Unbound tracks → `Drop` (from profile)
- All unsupported data → `Drop` (profile overrides everything)

If the profile omits `degradePolicy`, the plugin's `degradeDefaults` are used per-category.

## Plugin Protocol JSON Schemas

### Capabilities Response Schema

```json
{
  "type": "object",
  "required": ["protocolVersion", "id"],
  "properties": {
    "protocolVersion": { "const": 1 },
    "id": { "type": "string", "minLength": 1 },
    "name": { "type": "string" },
    "version": { "type": "string" },
    "supportedRoles": {
      "type": "array",
      "items": { "enum": ["Instrument", "Drums", "Vocal", "Automation"] }
    },
    "supportedEvents": {
      "type": "array",
      "items": { "enum": ["note", "chord", "drumHit", "breath", "control", "automation", "marker"] }
    },
    "lyricSupport": {
      "type": "object",
      "properties": {
        "modes": { "type": "array", "items": { "enum": ["text", "syllables", "phonemes"] } },
        "languages": { "type": "array", "items": { "type": "string" } }
      }
    },
    "paramSupport": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of supported automation param names"
    },
    "techniqueSupport": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of supported TechniqueId values"
    },
    "degradeDefaults": {
      "type": "object",
      "properties": {
        "unknownParam": { "enum": ["Error", "Drop", "Approx"] },
        "unknownTechnique": { "enum": ["Error", "Drop", "Approx"] },
        "unboundTrack": { "enum": ["Error", "Drop", "Approx"] }
      }
    }
  }
}
```

### Diagnostic Schema

```json
{
  "type": "object",
  "required": ["level", "message"],
  "properties": {
    "level": { "enum": ["error", "warning", "info"] },
    "code": { "type": "string" },
    "message": { "type": "string" },
    "location": {
      "type": "object",
      "properties": {
        "trackName": { "type": "string" },
        "placementIndex": { "type": "integer" },
        "eventIndex": { "type": "integer" },
        "pos": { "$ref": "IR_V3.schema.json#/$defs/Rat" }
      }
    },
    "context": {
      "type": "object",
      "additionalProperties": true,
      "description": "Additional context for the diagnostic"
    }
  }
}
```

### Artifact Schema

```json
{
  "type": "object",
  "required": ["kind"],
  "properties": {
    "kind": { "enum": ["file", "dir", "bundle", "stream"] },
    "path": { "type": "string" },
    "mediaType": { "type": "string" },
    "description": { "type": "string" }
  },
  "allOf": [
    {
      "if": { "properties": { "kind": { "enum": ["file", "dir", "bundle"] } } },
      "then": { "required": ["path"] }
    }
  ]
}
```

### Validate Response

Array of Diagnostic objects:

```json
[
  {
    "level": "warning",
    "code": "UNSUPPORTED_TECHNIQUE",
    "message": "Technique 'harmonics' not supported, will be ignored",
    "location": { "trackName": "Guitar", "eventIndex": 42 }
  },
  {
    "level": "error",
    "code": "UNBOUND_TRACK",
    "message": "No binding found for track 'Strings'"
  }
]
```

### Render Response

Array of Artifact objects:

```json
[
  {
    "kind": "file",
    "path": "/absolute/path/to/output.mid",
    "mediaType": "audio/midi",
    "description": "Standard MIDI file"
  }
]
```

## Known Limitations

The following are explicit design limitations of Tako v3:

1. **Score composition is not supported.** Each `score { ... }` is standalone; merging scores or reusing sound declarations across scores requires manual refactoring to shared Clip functions.

2. **Tracks cannot be dynamically constructed.** The number and configuration of tracks must be known at compile time within the `score { ... }` DSL block.

3. **Sub-beat tempo/marker positions require workarounds.** Score-level `tempo` and `marker` only accept `PosRef` (bar:beat), not absolute `Pos`. Use finer meter granularity or clip-based offsets.

4. **std:drums patterns assume 4/4.** Pattern generators like `basicRock(bars, q)` produce fixed durations that may not align with non-4/4 meters. Manual `stretch`/`slice` is required for other meters.

5. **Technique and automation portability is limited.** The interpretation of `TechniqueId` and `automation(param, ...)` depends on renderer capabilities. Use `degradePolicy` to control fallback behavior.
