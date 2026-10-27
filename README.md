# Talking Head

A 2D female talking head that reads text aloud in English or Hebrew, with lip sync. Static site, no build step, no API keys.

## Run

- **PC:** double-click `index.html`, or serve the folder: `python -m http.server 8000` → http://localhost:8000
- **Phone (same Wi‑Fi):** `python -m http.server 8000 --bind 0.0.0.0`, then open `http://<your-PC-IP>:8000` on the phone.
- **Anywhere:** upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).

## How it works

| Part | File | Notes |
|---|---|---|
| Speech | `js/app.js` | Browser Web Speech API (`speechSynthesis`). Picks a female voice by name; changeable under *Voice settings*. |
| Visemes | `js/visemes.js` | Converts spelling to 12 mouth shapes (English rules; Hebrew letters + niqqud, guessing missing vowels). |
| Sync | `js/app.js` | Snaps to the engine's word-boundary events when available; otherwise a timer whose speed self-calibrates from past utterances. |
| Avatar | `js/avatar.js` | Original SVG character with a parametric mouth (smoothly blended), blinking, gaze and head motion. |
| Looks | `js/looks.js` | 8 selectable characters (hair, colours, accessories) sharing one head rig. Add a look by adding an entry. Male looks prefer male voices. |

## Voices

Available voices depend on the device/browser:

- **Windows:** Microsoft Edge has natural online voices (English "Aria"/"Jenny", Hebrew "Hila"). Chrome only has the installed Windows voices; add Hebrew under *Settings → Time & language → Speech*.
- **Android:** Google Text-to-Speech, install the Hebrew voice data.
- **iPhone/iPad:** Hebrew "Carmit" and English "Samantha" are built in.
