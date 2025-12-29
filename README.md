# JP ↔ KR Dual Subtitles (YouTube & Netflix)

Chrome extension that reads on-screen captions and shows Korean and Japanese subtitles together. Japanese audio with Japanese captions will automatically surface Korean, and Korean audio will surface Japanese. Works on YouTube and Netflix.

## What it does
- Watches the existing player captions and mirrors them in our overlay.
- Calls `translate.googleapis.com` to translate every caption into Korean and Japanese.
- Shows up to three lines: original caption, Korean translation, Japanese translation. Empty/duplicate lines are hidden automatically.

## Installation (unpacked)
1. Download or clone this folder.
2. Open Chrome → `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Open a YouTube or Netflix video with captions turned on. Keep the native captions enabled so we can read and translate them.

## Files
- `manifest.json` – Extension manifest targeting YouTube/Netflix and Google Translate.
- `content.js` – Captions watcher, translation, and overlay rendering. Supports DeepL if you add your API key.
- `style.css` – Overlay styling tuned for readability on video.
- `icon.png` – Extension icon.

## Notes
- Translation defaults to the public `translate.googleapis.com` endpoint with `sl=auto`; results depend on the captions provided by the service.
- To use DeepL instead, open `content.js`, set `DEEPL_API_KEY` to your key (e.g., `xxxxx:fx`), and reload the unpacked extension.
- The overlay auto-enables native captions on YouTube/Netflix, stays visible even if the player control is off or paused briefly, and can be dragged anywhere. Use the “Subs” sidebar button to show/hide source/KO/JA lines, adjust font size/colors, or reset position/style.
- If a caption is empty or unchanged, the overlay hides itself.
- The overlay is read-only (no clicks) and sits above the native subtitles; you can move native captions higher/lower in each service’s player settings if they overlap.
