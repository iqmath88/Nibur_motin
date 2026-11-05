# Nibor Motion v0.9.0 — Mobile visual layers

Adds independent scene layers (text and LaTeX), stacking, direct drag and resize, duplicate, centering, lock, delete, and undo/redo (up to 45 checkpoints). The project still uses the same render() canvas for preview and export. Old JSON loads with an empty layers array. Does not embed audio in JSON.

Upload root files to GitHub Pages and retain the fonts directory. MathJax and MathLive still load over CDN. Test on a Galaxy S25 Ultra (Chrome/Samsung Internet) before replacing a production deployment.

Known limits: free layer math rendering requires MathJax loading; layer visibility and timing are scene-wide; undo/redo restores JSON state but does not roll back external audio files stored in IndexedDB.
