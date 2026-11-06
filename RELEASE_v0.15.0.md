# Nibor Motion v0.15.0 — Export Stability

- Reduce unnecessary UI rebuilding during recording.
- Track render-loop gaps over 100ms and background visibility during export.
- Show export progress approximately once per second.
- Restore editor controls after export or cancellation.
- Preserve MediaRecorder for compatibility. This is **not** an offline deterministic WebCodecs encoder.

## Limitations
Actual encoded frame cadence is browser-dependent. Backgrounding the app may interrupt recording. Device testing is required.
