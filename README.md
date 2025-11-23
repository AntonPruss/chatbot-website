# Chatbot website

A lightweight, single-page conversation flow built with Mermaid. The UI now auto-detects whether a backend is reachable: on GitHub Pages (or if `/api/chat` fails), it seamlessly switches to the built-in mock dialogue so you can try the experience entirely online.

## Try it on GitHub Pages (no local install)
1. Push this branch to your GitHub repository.
2. Go to **Settings → Pages → Build and deployment → Source** and pick **GitHub Actions**.
3. On the next push, the included `Deploy to GitHub Pages` workflow will publish the site. The workflow targets the `main` and `work` branches by default.
4. Open the published URL (shown in the Pages environment after the workflow finishes). The badge under the title will show **Mock mode** when using the built-in dialog.

> Tip: append `?mode=api` to the URL if you later deploy a backend that exposes `/api/chat` (for example, on Vercel). Use `?mode=mock` to force mock mode.

## Running locally (optional)
If you do want to run it on your machine:
```bash
npm install
npm start
```
Set `OPENAI_API_KEY` to talk to the real model; otherwise the server will serve the same mock dialog as GitHub Pages.

## Files of interest
- `index.html` – layout and styling, with a live badge showing backend status.
- `flow.js` – renders the flowchart and now falls back to browser-side mock logic when no API is available.
- `.github/workflows/deploy-pages.yml` – GitHub Actions workflow that deploys the static site to Pages.
