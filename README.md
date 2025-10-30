# Contextual Smart Notes

> Capture, process, and save web content directly from your browser — privacy-first, on-device, and developer-friendly.

Contextual Smart Notes is a Chrome extension that helps you quickly capture highlighted text or media from any webpage, then summarize, translate, rewrite, proofread, or save it — all from the extension popup. The project is designed to run on-device where possible and includes mock modules and Node-based tests for offline/CI-friendly development.

## Key features
- Capture selected text and media from web pages (content script  popup messaging)
- Summarize, Translate, Rewriter, Writer, Prompt (LanguageModel) and Proofreader integrations with streaming and batch modes
- Local persistence using IndexedDB for saved notes
- Mock-mode for offline testing and CI (mock implementations for all on-device APIs)
- Developer-friendly Node tests for mocks (popup/tests/)

## What problem is this submission addressing

People frequently copy/paste web content into external tools to summarize, translate, or edit text — a workflow that breaks context and can expose sensitive content to cloud services. Contextual Smart Notes brings these capabilities into the browser popup, prioritizing on-device processing and local storage to keep data private while preserving context.

## Built with

- JavaScript (ES2020+) — extension logic, popup UI, content scripts, mocks (content.js, popup/popup.js, popup/*.mock.js)
- HTML & CSS — popup and options UI (popup/popup.html, popup/popup.css, popup/options.*)
- Chrome Extension MV3 — manifest.json, action popup, content scripts
- IndexedDB — persistent, local notes storage (popup/storage.js)
- chrome.storage.local — small availability and feature caches
- Node.js & npm — mock tests and developer scripts (popup/tests/*, package.json)

Security note: the project contains a lightweight script-stripping sanitizer used for rendered HTML/Markdown. For production use, integrate a robust sanitizer such as DOMPurify when rendering user or model-generated HTML.

## Quick start — load the extension locally

1. Install dependencies (optional, for tests):

`powershell
npm install
`

2. Load unpacked extension into Chrome:

- Open chrome://extensions/ in Chrome
- Enable  Developer mode
- Click Load unpacked and select the project root directory

3. Open the popup and test features. Inspect popup logs via popup DevTools (right-click inside popup  Inspect).

## Testing

### Automated mock tests

The project includes small Node-based tests for mock modules. Run them locally:

`powershell
npm test
`

Expected: tests for translator, language detector, and summarizer run and exit with code 0. Add more tests to popup/tests/ as you implement additional mocks.

### Manual QA checklist

- Select text on a page and open the popup — selection should appear in the popup.
- Run Summarize / Translate / Proofread with mock-mode enabled and disabled to ensure fallbacks work.
- Save a note and verify persistence under Saved Notes and in IndexedDB (Application  IndexedDB in DevTools).
- Verify streaming handlers show progressive chunks and can be aborted.

See TESTING.md for a longer QA checklist (optional — can be added).

## Developer notes

- Content capture and messaging: content.js
- Popup orchestration and UI: popup/popup.js, popup/popup.html
- Storage layer (IndexedDB): popup/storage.js
- Mock implementations: popup/*-mock.js
- Node tests: popup/tests/*

### Recommended next steps

- Integrate DOMPurify for safe HTML rendering of model output
- Add more mock tests (writer/rewriter/proofreader) to 
pm test
- Add a GitHub Actions workflow to run 
pm test on push and PRs

## Contributing

Contributions are welcome. If you add tests or change behavior, please include or update unit tests for mocks and describe privacy/security implications of any external services.

## License

This repository does not include a license file. Add a LICENSE if you want to grant reuse rights (MIT is a common choice for small projects).

---

If you want, I can: add a TESTING.md, wire DOMPurify into the popup rendering flow, or scaffold a GitHub Actions CI workflow to run 
pm test on pushes — tell me which and I will add it and push it to main.
