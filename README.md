# Nibor Motion v0.5.0

## Features
- Animated educational emoji stickers per scene; drag on canvas with touch/mouse, adjust size and timing.
- Audio import and microphone capture, local IndexedDB storage.
- Export mixes the Canvas video track with the audio track using Web Audio MediaStreamDestination when supported.
- Master canvas 1080x1920, but actual encoded video resolution may be reduced by Safari; inspect the output.
- Retains MathLive, MathJax, themes, existing projects, scene timings, header/footer customization.

## Important caveats
- MP4 with audio relies on Safari browser codec and MediaRecorder support; WebM fallback where available. It is not guaranteed for every iPad.
- Recorded/imported audio is stored separately in IndexedDB, NOT included in JSON exports. Re-importing JSON on another device requires importing audio again.
- Recorded audio is one project-wide clip, not a fully featured multitrack timeline; initial delay and volume are configurable.
- SVG/mathematical rendering requires a first-time connection to the CDN.
- Browser permissions require HTTPS for microphone access.
- Use this ZIP's seven files directly in repository root. No enclosing folders.
