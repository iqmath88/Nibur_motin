# Optional HTTPS TTS endpoint (Cloudflare Worker)

Nibor Motion is hosted on GitHub Pages: **never** put OPENAI_API_KEY into browser source or localStorage.

Create a Cloudflare Worker with a POST /tts endpoint. Set OPENAI_API_KEY as an encrypted worker secret. Set ALLOWED_ORIGIN to https://iqmath88.github.io and authenticate clients/rate-limit before using on a public site: CORS is not authentication.

The app sends `{ "text": "...", "voice": "marin", "speed": 1.0 }`. The endpoint must return an audio/* blob such as audio/mpeg with Access-Control-Allow-Origin for the app origin.

**Provider warning:** the older OpenAI speech models (including gpt-4o-mini-tts) shut down January 6, 2027. This example is not a future-proof backend. Plan migration to the Realtime API before that date; that interface is different and requires a new adapter.

Deploy the example `tts-worker.js` separately, then enter the deployed HTTPS URL in the app. The Worker is deliberately **not** deployed with GitHub Pages.

For secure production use, put the endpoint behind identity checks, per-user quotas and abuse protection; otherwise anyone can incur API charges.
