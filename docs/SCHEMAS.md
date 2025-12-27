# Schemas (v3)

These JSON schemas define the v3 IR and Render Profile formats.

- Score IR schema: `docs/schemas/IR_V3.schema.json` (`tako.irVersion = 3`)
- Render Profile schema: `docs/schemas/PROFILE_V3.schema.json` (`tako.profileVersion = 1`)

The CLI validates both with Ajv during `mf build` and `mf render`.
