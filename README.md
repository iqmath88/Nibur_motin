# Nibor Motion v0.4.0

## Deployment
Upload **all six files** from this ZIP directly to the **root** of `iqmath88/Nibur_motin` on the `main` branch. Do not upload the ZIP itself or nest files inside a directory.

## Changes
- An editable MathLive math field synchronized with the LaTeX source input (online library). Fallback to text input if unavailable.
- MathJax SVG mathematical rendering cached into images, drawn on the **same 1080×1920 Canvas** for preview and exported video.
- Configurable progressive appearance timing for question, equation and answer.
- Scene strip and seek bar; save/import/export backward-compatible JSON projects.
- PNG scene export and MediaRecorder video capture with MP4 if supported, WebM fallback.
- PWA cache version update; responsive Arabic iPad/Windows layout.

## Important limitations
- MathLive and MathJax use public CDNs, so initial math library loading requires Internet. Offline viewing can fall back to plain math text. The program shell can work offline after first visit.
- SVG-to-Canvas mathematical rendering can vary by browser. Verify full formulas and exported video before publication.
- Video capture occurs in real time. The browser may restrict or fail recording in the background; keep the tab active.
- MP4 cannot be guaranteed on iPad/Windows; WebM is used if supported and MP4 is not. There is no audio recording yet.
- The math editing surface uses MathLive when available; it is not an AI symbolic solver.

## Smoke tests
1. Enter `\\frac{x^2-4}{x-2}=x+2`; confirm its rendering in preview.
2. Change scene duration and onset sliders; play through all scenes.
3. Export PNG, play a recorded video, and check equation visual consistency.
4. Save, reload and import legacy v0.2.0 JSON.
5. On iPad, verify editing and test export in Safari with screen awake.

## New in v0.4.0
- Edit the text in the video header and footer for the whole project.
- Independently show/hide header and footer; restore defaults with one button.
- Live updates appear in the same Canvas used for preview, PNG, and browser video capture.
- Branding settings persist in localStorage and project JSON exports/imports. Older v0.1–0.3 projects get default header/footer text automatically.
- Export declines to record until mathematical SVG assets have loaded, preventing silent plain-text fallback in exported equations.

## Limits
- Browser-based MP4 export remains device-dependent; WebM may be used instead.
- MathLive and MathJax still use public CDNs, so visual editing and math rendering require connectivity on a fresh installation.
- Audio export is not included. Browser testing on the actual iPad remains required.
