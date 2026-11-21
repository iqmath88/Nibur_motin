# Nibor Motion v0.16.1 — Test report

## Passed
- `node --check` for all JavaScript files: no syntax errors.
- Unit smoke test of `cone-cinematic.js`: six generated scenes, each with stage index and LaTeX expression; deterministic Canvas draw for all six stages without exceptions in mocked context.
- Confirmed geometry relation r = h/3 and h(t) = cubic-root(27*(V0 + 4t)/π), V0 = π*(9.5)^3/27; positive increasing height.
- Confirmed file inclusion in `index.html` and offline cache list `sw.js` and version 0.16.1.

## Not yet tested / limitations
- Browser rendering and export on iPad Safari, Samsung Chrome, and Windows: not tested. Local browser navigation was blocked by environment network policy.
- Existing `test-auto-reels.cjs` fails due to its DOM stub (`addEventListener is not a function`), independent from this new module; do not treat it as a passed test.
- New cone graphic has not been visually reviewed in the integrated UI; overlap of text, subtitles or stickers needs real-device inspection.
- The six-stage template assumes the demonstration values H=24 cm, R=8 cm, dV/dt=4 cm³/s at h=12 cm; this is a sample and is not verified against any original textbook page.
- The generated cone is a 2.5D Canvas illustration, not a 3D mesh nor a general-purpose reusable geometry editor. Voice narration is not generated automatically.
- User should back up current work before pressing the generate button; it replaces the current scenes after confirmation.

## Suggested next tests
- Generate new project, export MP4 and PNG and compare frame 1, mid-scene, and last scene.
- Save `.nibor`, reload it, confirm coneStage values retained.
- Verify in Safari iPad and Android Chrome, offline reload and no missing assets.
