# Fundalyst — Backend

**There is no backend.** Fundalyst is a 100% client-side application. Everything runs in the browser.

## What this means

- **No server.** No Express, no API routes, no database server, no WebSocket.
- **No auth.** No sign-up, no login, no sessions, no OAuth.
- **No cloud.** No data is uploaded anywhere. Nothing leaves the device.
- **No live market data.** No price feeds, no real-time quotes.
- **No credentials stored.** The app never asks for or stores provider credentials in localStorage or frontend code.

## Why this is a feature

For an equity-research analyst working on sensitive filings, "no upload" is a trust signal. Fundalyst's privacy promise — your financial data never leaves your computer — is a deliberate differentiator, not a limitation.

## What the app DOES use

| Concern | Mechanism |
|---|---|
| Persistence | `localStorage` (a few KB of serialised Zustand state) |
| PDF rendering | `pdfjs-dist` — runs entirely in the browser via Web Worker |
| OCR | `tesseract.js` — runs in the browser via Web Worker |
| Spreadsheet parsing | `xlsx` (client-side only) |
| Charts | `recharts` — SVG rendered in the browser |

## Patterns to never introduce

- A network call that carries user financial data
- An API route that receives or stores imported facts
- A backend dependency for core analysis
- Fake "enterprise" features that simulate cloud connectivity without a real backend

## What would need a backend

These are explicitly future / out-of-scope:

- Multi-user collaboration
- Immutable audit logs
- Shared company coverage sets
- Cloud backup (beyond the manual workspace JSON export that exists today)
- Live market data integration
- Server-side AI inference (T14 is designed as an optional, opt-in client-side feature)

See `HANDoFF.md` §"Known Risks / Later Work" for the current state of these.
