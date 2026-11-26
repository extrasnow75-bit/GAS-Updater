# GAS Updater

A desktop app (Windows and Mac) that pushes the latest Blueprint Tools Apps Script from GitHub
into many Google documents at once, checks which documents are out of date, and keeps a record
of every update.

## Status: test build

This is a **test build**. It looks and behaves like the finished app, but everything in it is
example data. It does **not** connect to Google or GitHub, and nothing you do in it changes any
real document. Its purpose is to try the screens and the flow before the real connections are
built.

What you can try:

1. **Initial setup.** One item is incomplete. Choose the backup folder with *Choose from Drive*
   and the panel closes by itself.
2. **Add documents.** *By design cycle → Add*, or *Choose from Drive* (tick folders and files;
   step 2 shows what is inside the folders).
3. **Check selected.** Watch the Check Timeline; out-of-date documents are ticked for you.
4. **Choose where each document updates from.** *Update from: Main Repo / Experimental Repo*,
   or open *Tools and files* and choose per tool. PSYC 3015 shows a warning with one-click fixes.
5. **Update selected.** Try a practice run first, then untick *Practice run* for a "real" run
   (which only changes the example data). Try *Copy results* and *Export to Google Sheet*.

## Getting the test build on Windows

1. Open the repo on GitHub, choose **Actions**, then the latest **Test build** run with a green tick.
2. Under **Artifacts**, download **GAS-Updater-TEST-BUILD-Windows** (you need to be signed in to
   GitHub). It is a .zip file holding the installer.
3. Unzip it and double-click the `.exe`. Windows will say **"Windows protected your PC"**: choose
   **More info**, then **Run anyway**. This appears because the app is built in-house.

## For developers

- `npm install`, then `npm run dev` to run it, `npm test` for the tests, `npm run typecheck`.
- Same stack and layout as Canvas Extractor Tools: Electron, React and Tailwind, built with
  electron-vite and electron-builder.
- `src/logic/compare.ts` holds the comparison and choice rules (pure functions, tested in
  `compare.test.ts`). `src/logic/exampleData.ts` holds the test build's example data.
- `mockups/` holds the clickable design mockups; `spike/` holds the Phase 0 feasibility test
  script; `docs/decisions.md` records every design decision.
