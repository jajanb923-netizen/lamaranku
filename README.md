# LamaranKu — AI Job Application Letter & CV Builder for Factory Workers

**LamaranKu** helps Indonesian factory workers write a formal job application
letter (*surat lamaran kerja*) and a concise CV in minutes. Fill in one form,
pick a tone, and the app produces both documents — ready to copy, print, or
save as PDF. Free, no account, no server: your data stays on your device.

Built for **SLAY HACKS 2026** (Devpost, $5,000 in prizes, submission deadline
December 7, 2026).

## Who it is for

Millions of Indonesians apply for factory jobs — operator produksi, QC,
packing, gudang, maintenance, forklift — but many have never written a formal
application letter. A weak letter or a messy CV is often the first reason an
application is ignored. LamaranKu turns the worker's real data into documents
a hiring manager (HRD) will actually read:

- **Formal Indonesian** — correct, polite, standard HRD format.
- **Fresh graduates welcome** — zero experience is fine; the letter
  highlights education and willingness to learn instead of inventing jobs.
- **Mobile-first** — most users are on phones; the whole flow works on a
  small screen.
- **Works offline** — if the AI service is not configured, a built-in
  template still produces a correct letter and CV, clearly labelled.

## How the AI works

The app uses **Firebase AI Logic** with hybrid inference, the same pattern as
our LedgerLens entry:

```js
getAI(app, { backend: new GoogleAIBackend() })
getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,   // Gemini Nano on Chrome first
  inCloudParams: { model: 'gemini-3.5-flash-lite', ... },
  onDeviceParams: { promptOptions: { systemInstruction: ... } },
})
model.generateContent(prompt) -> response.text()
```

Two prompts run in parallel — one writes the letter, one writes the CV —
from the same profile data. The model is instructed to use **only** the data
given: it never invents facts and never writes bracket placeholders.

Every output shows where it was computed:

| Badge | Meaning |
|---|---|
| `AI · Gemini Nano (perangkat)` | Answered on-device by Gemini Nano |
| `AI · Gemini (cloud)` | Answered in the cloud by Gemini Flash |
| `Template · Lokal` | Local template fallback — **never presented as AI output** |

**No Firebase project yet?** The app still works end to end. Until a real
config is pasted into `js/firebase-config.js`, it runs in local template
mode — every feature works with zero setup and zero keys. No API key or
secret is in this repository.

## Features

- Form: personal data, education, work experience (0 allowed), skills
  (quick-pick chips for common factory roles + free text), target job.
- Tone selector: Formal / Fresh graduate / Experienced.
- Live print-ready preview; both documents are editable in place
  (`contenteditable`) before copying or printing.
- Buttons: **Salin** (copy), **Cetak / Unduh PDF** (print CSS: A4, letter on
  page 1, CV on page 2), **Simpan** (localStorage — data stays on device).
- **Isi contoh** loads a realistic fictional factory-worker profile and
  generates the documents in one tap, so anyone can try it instantly.

## Run locally

No build step, no dependencies. Any static server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

It also works from `file://` (except the Firebase SDK import, which needs
network) and from GitHub Pages.

## Enable the real AI (optional, free, ~5 minutes)

1. Create a free Firebase project at https://console.firebase.google.com
   (Spark plan, no billing).
2. Build → AI Logic → Get started → enable the Gemini Developer API backend.
3. Project settings → Your apps → Web app → copy the `firebaseConfig`.
4. Paste it into `js/firebase-config.js`, replacing the `YOUR_...`
   placeholders.
5. If your project enforces App Check for AI Logic, register a debug token
   (App Check → Manage debug tokens) and set it in `js/ai.js`
   (`self.FIREBASE_APPCHECK_DEBUG_TOKEN`) — debug tokens are accepted in
   hackathon submissions.

## Project structure

| File | What it is |
|---|---|
| `index.html` | App shell + Firebase SDK 12.6.0 import map |
| `css/styles.css` | All styling (mobile-first) + print CSS (A4) |
| `js/app.js` | UI wiring, localStorage, copy/print |
| `js/ai.js` | Firebase AI Logic hybrid inference + local templates |
| `js/firebase-config.js` | Placeholder config + free setup guide |
| `js/seed.js` | Demo profile + skill chips |
| `manifest.webmanifest`, `.gitignore` | PWA manifest, ignores |
| `LICENSE` | MIT |
| `README.md` | This file |
| `STATUS.md` | Build + verification status |

## License

MIT — see [LICENSE](LICENSE).
