# Schemas (v4)

These JSON schemas define the v4 IR and Render Profile formats.

- Score IR schema: `docs/schemas/IR_V4.schema.json` (`tako.irVersion = 4`)
- Render Profile schema: `docs/schemas/PROFILE_V3.schema.json` (`tako.profileVersion = 1`)

The CLI validates both with Ajv during `mf build` and `mf render`.
