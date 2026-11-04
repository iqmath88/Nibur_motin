# Nibor Motion v0.2.0

Static PWA. Upload all files from the ZIP **directly to the GitHub repository root** (no enclosing folder).

## Improvements
- KaTeX equation rendering in browser preview (requires CDN access).
- Progressive title/question/equation/answer appearance during playback and recording.
- Scene timeline and LaTeX shortcut buttons.
- Canvas video capture at 1080x1920. Browser may export WebM rather than MP4.
- Updated cache/version.

## Known limitations
- Canvas export uses plain text for equations, so LaTeX visual rendering differs from preview.
- MP4 and offline KaTeX are not guaranteed; CDN is required for KaTeX.
- Audio recording and true visual equation editing are not implemented.
- Test recording and playback on target iPad/Windows browsers before publishing.
