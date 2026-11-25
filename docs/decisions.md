# GAS Updater: decisions and requirements so far

Changes to the original plan ("Blueprint Script Updater"), as agreed with Greg.

- **Name:** the app is **GAS Updater**. It lives in this repo (`extrasnow75-bit/GAS-Updater`),
  not in Blueprint Tools. Work happens on a branch, not `main`.
- **Look, feel and error handling:** based on the Canvas Extractor Tools desktop app
  (`extrasnow75-bit/canvas-extractor-tools`). Error messages follow its rules
  (`electron/ipc/googleMessages.ts`, `src/components/ErrorText.tsx`): say what happened in plain
  words, what it means, and what to do next; no status codes; the technical cause comes last after
  "Details for support:", behind a "Show technical details" toggle with a Copy button; web
  addresses in a message are clickable; "Initial setup" appears in italics.
- **Drive picker:**
  - Choose individual files of any type that can hold a script (Docs, Sheets, Slides, Forms
    and so on) **and** whole folders.
  - Tick boxes, so several files and folders can be chosen at once.
- **Desktop app or Apps Script web app:** not yet decided (see the Phase 0 report).
