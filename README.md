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
| Updates | `js/update-check.js` | Every 5 min and on returning to the tab, compares the deployed files with the loaded ones and offers a reload. Add new files to its `FILES` list. |
| Looks | `js/looks.js` | 8 selectable cartoon characters (hair, colours, accessories) sharing one head rig, plus photo avatars. Add a look by adding an entry. Male looks prefer male voices. |
| Photo avatars | `js/photo-avatar.js` | Warps a portrait photo with a WebGL mesh on MediaPipe face landmarks (mouth, jaw, blinks, gaze, head sway) and paints teeth/mouth interior. "Your photo" runs face detection in the browser; the photo never leaves the device. |

### Adding a bundled photo

1. Put a front-facing portrait (closed mouth, even light, ~768px) in `photos/`. Use AI-generated faces or photos of people who agreed.
2. Add `{ id, name, gender, photo: 'photos/x.jpg', landmarks: 'photos/x.json' }` to `js/looks.js`.
3. The landmarks file is optional (without it, landmarks are detected on first use), but it saves phones a ~4 MB model download. To make one, pick the photo via "Your photo" and run `JSON.stringify(AvatarLooks.find(l => l.upload).detected)` in the browser console.

`photos/lena.jpg` is a public-domain StyleGAN image from Wikimedia Commons ([File:Woman 1.jpg](https://commons.wikimedia.org/wiki/File:Woman_1.jpg)).

## Voices

Available voices depend on the device/browser:

- **Windows:** Microsoft Edge has natural online voices (English "Aria"/"Jenny", Hebrew "Hila"). Chrome only has the installed Windows voices; add Hebrew under *Settings → Time & language → Speech*.
- **Android:** Google Text-to-Speech, install the Hebrew voice data.
- **iPhone/iPad:** Hebrew "Carmit" and English "Samantha" are built in.
