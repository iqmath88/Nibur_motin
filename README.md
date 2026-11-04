# Nibor Motion v0.5.2 — Scene narration

Upload the **seven static app files** from this ZIP to repository root (not the ZIP itself).

## Voice features
- Each scene has editable narration text, speech rate, a browser voice preview, a generated-audio voice selector, microphone recording, file import, and independent saved clip.
- Browser speechSynthesis is preview ONLY, and is NOT embedded in video.
- To generate an actual audio file from the text, deploy an HTTPS speech endpoint (see TTS_ENDPOINT.md) and paste its URL in the app. The static GitHub Pages site cannot keep API keys secure or produce paid speech by itself.
- Generated/imported/recorded clips are stored in IndexedDB per stable project ID + stable scene ID. Clips are NOT packaged in JSON backups. Renaming a project preserves its storage namespace; audio clips are still local to this browser/device.
- Export combines audio clips on the scene timeline using Web Audio, with the same Canvas render as preview. Playback and real output size need iPad testing; Safari may downscale or fail to mux.
- Existing v0.5.0 project JSON remains readable. Old global audio clips do not migrate automatically to a particular scene.
- AI-generated voice must be disclosed to viewers.

## Caveats
- Voice selection for speechSynthesis depends on installed device voices; generated voices depend on endpoint capabilities.
- OpenAI legacy /v1/audio/speech models are scheduled for retirement January 6, 2027. The supplied example Worker is a temporary adapter only; replace its provider/model before that date.
- Audio of one scene longer than scene duration may be truncated (unless Auto duration is on).
- Recording/export tests on iPad are required.
