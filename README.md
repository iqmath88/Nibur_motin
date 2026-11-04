# Nibor Motion v0.4.1 — iPad Math Rendering Fix

Upload the **seven files** directly to the GitHub Pages repository root. No enclosing folder.

## Changes
- Fixed SVG math rendering pipeline: preserve MathJax SVG viewBox, pixel dimensions and explicit fill color for Safari.
- Detect malformed or unloaded equations, display a warning instead of an opaque rectangle, and block video export until all formulas are rendered.
- Adjustable header/footer font sizes (22–80 px), with visibility/text controls preserved.
- Existing v0.4.0 projects and v0.1–v0.3 JSON remain readable; new settings default safely.
- MathLive virtual keyboard auto policy for touch and improved missing-library fallback.
- Updated version and service-worker cache to v0.4.1.

## Limitations
- Requires MathJax/MathLive downloads from CDNs on first use; offline math availability isn't guaranteed.
- MP4 still depends on Safari/Chromium MediaRecorder capabilities; WebM may be used instead.
- Equation rendering on real iPad Safari must be tested after deployment. An invalid expression such as `\s=\left{8\right}` must be corrected (for instance `\boxed{8}`), not treated as a valid formula.
- No audio support in this version.

## Smoke tests
1. Type `\frac{x^2-4}{x-2}=x+2` in LaTeX, wait for it to render; no black bar.
2. Change header/footer sizes and verify matching PNG and video framing.
3. Type malformed LaTeX; verify the warning and that exporting is refused.
4. Import a JSON project from v0.4.0 and check scene preservation.
5. Run iPad Safari recording; confirm final video container and visual correctness.
