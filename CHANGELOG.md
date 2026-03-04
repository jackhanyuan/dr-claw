# Changelog

## v2026.3.0 - 2026-03-04

### Highlights
- Added a guided starter flow in Chat with skill-aware prompt templates to improve first-run onboarding and task kickoff.
- Expanded the Research Lab pipeline by introducing a new presentation/promotion stage and related workflow improvements.
- Improved task management ergonomics in Research Lab with inline task editing and better edit-state handling across project switches.
- Strengthened artifact handling by filtering internal planning files from preview and simplifying placeholder behavior.

### Notable Changes
- `feat(chat): add presentation guided starter scenario`
- `feat(chat): add guided starter with skill-aware prompt templates`
- `feat(researchlab): add inline task editing in pipeline board`
- `feat(researchlab): improve task card edit discoverability and i18n`
- `fix(researchlab): reset inline edit state on project switch`
- `feat: add presentation pipeline as 4th research stage`
- `refactor(pipeline): rename presentation stage to promotion`
- `fix: presentation pipeline sanity fixes`
- `fix: guard process.env access in shared modelConstants for browser compatibility`

### Validation
- `npm run typecheck` passed.
- `npm run build` passed.
