# Nibor Motion v0.16.1 — Cone Cinematic integration (prototype)

- Added `cone-cinematic.js` Canvas-rendered water-filled cone simulator with mathematically coupled height and radius; volume increases at 4 cm³/s.
- Added button in existing Auto Reels panel to generate six editable scenes with proper LaTeX formula content through the existing MathJax rendering pipeline.
- Added persistent, validated `coneStage` field to each scene so timeline playback, saving/import and video encoding share the same simulation rendering.
- New code loaded before `app.js`, included in offline service worker cache, incremented version to v0.16.1.
- Existing UI, scene editing, audio, WebCodecs, MediaRecorder, backup and export paths remain in place.
- This is a development build, not a release to GitHub. Browser and device export compatibility remain to be verified.
