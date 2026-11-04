# Nibor Motion v0.5.4 — Free audio workflow

This is a complete static GitHub Pages release. Extract all nine files directly into the repository root (no enclosing folder).

## Changes
- Per-scene math narration preparation, editable before speech generation.
- Copy narration and launch an Apple Shortcuts workflow named **Nibor Voice** on iPad (Shortcuts URL scheme).
- Instructions in-app to create a shortcut: Shortcut Input (Text) -> Make Spoken Audio from Text -> Save File. Import the saved audio into the same scene using the existing file picker.
- Existing recording, audio import, IndexedDB per-scene preservation and audio/video export retained.
- Cloud TTS remains optional. There is no model or secret embedded in this release.
- Version and service worker cache bumped.

## Critical limitations
- **This is a no-subscription workflow, NOT automatic in-browser local neural TTS.** iPadOS must offer the Shortcuts action and an appropriate Arabic voice. The Shortcut saves audio; Safari requires the user to import it manually into the chosen scene.
- Launching `shortcuts://` is device-specific; some browsers will block or warn. Copy text if it does.
- Math-to-speech conversion covers only common formulas; review text manually before generating spoken audio.
- `speechSynthesis` listening preview does not create an audio clip.
- Exported MP4 audio tracks and 1080p encoding depend on iPad Safari / MediaRecorder support; hardware validation remains necessary.

## Tests
Run `node --check app.js`, `node --check sw.js`; verify UI IDs; unzip-test and flat-archive check. Browser smoke tests can be performed with Playwright if available.
