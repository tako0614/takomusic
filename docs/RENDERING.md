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

Binding resolution (recommended):

1. `selector.trackName`
2. `selector.sound`
3. `selector.role`

If multiple bindings match, the first match wins.

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
- `path` (optional)
- `mediaType` (optional)
- `description` (optional)

## Degrade Policy Guidance

- `Error`: fail on unsupported data
- `Drop`: omit unsupported data with warnings
- `Approx`: approximate unsupported data with warnings
