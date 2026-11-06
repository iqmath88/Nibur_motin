# Nibor Motion v0.14.1 — Preview reliability patch

- Replaced generated-project DataTransfer/file-input assignment with an internal event, improving iPad compatibility.
- Added readable offline fallback for math expressions when MathJax is unavailable or still loading.
- Added a guarded preview renderer with visible error feedback rather than a completely blank canvas.
- Preserved existing project storage, export, and scene editing.

## Testing
Static JavaScript syntax checks and ZIP integrity check. Actual iPad/Samsung browser testing remains required. This patch does not guarantee MP4 export on all browsers.
