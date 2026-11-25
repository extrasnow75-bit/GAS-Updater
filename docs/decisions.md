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
- **Desktop app**, built like Extractor Tools (Electron + React + Tailwind), not an Apps Script
  web app.
- **Public repo:** anyone can download the app. That is fine: Google's own sharing decides who
  can change which documents. No client secret or token goes in the repo (same pattern as
  Extractor Tools' `googleConfig.ts`). A user allowlist is not needed.
- **Script sources:** main = `extrasnow75-bit/blueprint-tools-script` (public); experimental =
  `extrasnow75-bit/blueprint-tools-script-private` (private, needs a read-only GitHub token).
  To be confirmed.

## Google files found so far (extrasnow75 Drive connector)

- Blueprint template test copy: "Copy of Template Blueprint 6.0 for GAS Test (Nov 2026)",
  `1KKlxnDcBXZJ1vrNrVsb_k03CJM7sS8i_m-Bm7LDz4_A` (owned by extrasnow75). Good candidate for the
  Phase 0 test copy.
- Multi-semester list: only an Excel copy was found, "Copy of Multi-Semester List
  (11_02_2026.xlsx", `1GlhVqQUkVePmkxVPyA1GjNewxIAXxlQl`. The app needs the live Google Sheet.
- Quiz templates: Google Docs (the Quiz Creator app reads quizzes from Docs; "Quiz Questions
  Extraction Template" is a Doc). Whether they have their own script is to be confirmed.

## Test files

- For now, all work and testing uses **copies** of key documents in the extrasnow75 Drive.
  Greg will provide the addresses of the live documents later. Nothing touches live documents
  until then.

## Reuse from the Rubric Creator app (`extrasnow75-bit/Rubric-Creator-Desktop-App`)

- **Update Timeline:** copy the Deployment Timeline in `src/components/Part3Upload.tsx` (dark
  panel, timestamped lines, green ✓ / red ✗, Copy Logs with app version and date, Clear). It shows
  which script files went into which document, with which Google account, the backup made, and
  the check afterwards. The log sheet stays the permanent record.
- **Drive picker:** start from `src/components/DriveBrowser.tsx`, the app's own Drive browser
  (Google's Picker cannot run in a packaged desktop app). It needs multi-select with tick boxes
  for files of any type and folders.

## Initial setup: Templates card

- Holds the addresses of the **blueprint template** and the **quiz questions template** (both
  Google Docs), each set with Choose from Drive or by pasting. The main screen has a one-click
  link to add both templates to the documents list.
