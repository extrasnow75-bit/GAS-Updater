# Test build review (2026-11-26)

Four independent read-only reviews of the test build: code, accessibility (WCAG 2.2 AA),
security, and usability. Nothing was changed by the reviews. This file is the combined,
de-duplicated list. "Now" = fix in the test build. "Next phase" = design into the real
Google/GitHub connections.

## Fix now: bugs

1. Exports name the wrong Google account (uses the account in use now, not the document's).
2. "Compare with" tick boxes do nothing beyond disabling Check.
3. Check summary counts documents from earlier Check runs; counts disagree between the summary
   card, status line and timeline (quizzes left out of one, "checked" means different things).
4. Text size readout shows 100% after a restart even when a saved size is applied.
5. Dialogs grab focus again on every screen refresh (typing in the picker's search breaks
   while a run is animating; ticking Practice run in the confirm dialog moves focus).
6. Results panel keeps the previous run's note and export preview.
7. Clearing during a real update can apply old changes later.
8. Picker's "Add N to the list" count can double-count; "1 files would change" plural.
9. A document without a saved choice would be wrongly reported as "script not found"
   (only matters once real documents exist, but cheap to fix now).

## Fix now: accessibility

1. Focus lost to the page after Look inside, picker steps, closing dialogs, and when Check
   becomes disabled while focused (use aria-disabled; return focus to the opener).
2. Dialogs don't keep keyboard focus inside them; Help dialog has no Escape.
3. Results and status changes are not announced to screen readers (summary, status line,
   setup completing, new warnings, picker counts).
4. Faded "Update from" text is 2.4:1 contrast (needs 4.5:1).
5. Segmented-control focus ring and borders too faint; token show/hide button too small.
6. Repeated identical button names ("Choose from Drive", "Look inside") need context.
7. Account menu uses menu roles without menu keyboard behaviour; make it a simple disclosure.
8. Table row headers, required-field asterisks, heading markup, breadcrumb aria-current,
   account badge label, hover-only reasons for greyed-out options.

## Fix now: usability

1. Long page: Check/Update buttons sit below every document. Sticky action bar at the bottom;
   tables closed by default with Open all / Close all; move "Compare with" up.
2. Tools and files table: use the full card width so dates stay on one line and no sideways
   scrolling; shorter headers.
3. Misleading words: "Missing" reads as missing from GitHub (rename "Not in document");
   "Same date, different content" in red is alarming (make amber); HLTH shows "Extra files"
   instead of "Out of date".
4. Confirm dialog in real mode: change title, label and colour; fix "Practice run :".
5. Warning wording: cause, effect, then choice, with real buttons. "Check screen" doesn't
   exist: say "in the document list".
6. After a practice run, make "Update for real" the main action, not Export.
7. Timeline file lines wrap and lose their columns.
8. Missing from the mockup: "How do I get a GitHub token?", "Open the update history",
   backup links.
9. Smaller: setup dots unexplained, picker wording, Sheets/Slides tickable when adding
   documents, ribbon wraps at default size.

## Fix now: security (small)

1. Ignore ELECTRON_RENDERER_URL in the installed app.
2. Turn on Electron fuses (block run-as-Node, inspect flags, NODE_OPTIONS; asar integrity).
3. Workflow: `permissions: contents: read`; pin actions by commit.
4. `npm audit fix` for build-tool advisories (nothing vulnerable ships in the app).
5. Validate IPC inputs and sender; deny permission requests and webviews; limit github.com
   links to extrasnow75-bit.
6. Personal email addresses appear in the public repo (support contact): confirm intended.

## Next phase: design requirements

- **Supply chain (critical).** A compromised repo or token would push bad code into every
  blueprint. Update only from a specific commit or signed release tag, show what changes
  before writing, protect both repos' main branches (required review, no force-push), treat
  any appsscript.json permission change as a separate approval, record the commit in the
  update history.
- **Wrong-document safety.** Only write to documents chosen in this session; confirm the
  script belongs to that document (parentId) before writing; back up first; stop on first
  failure; cap batch size.
- **Sign-in scopes.** script.projects is needed (sensitive). Prefer drive.file over
  drive.readonly (restricted) to avoid Google's security audit.
- **Tokens.** Main process only; refuse plain-text storage; Google token only to Google, GitHub
  token only to GitHub; recommend fine-grained, read-only, one-repo, expiring GitHub tokens;
  revoke on sign-out.
- **Code signing** before real use.
- **Code structure.** Read real facts (menu items, permission scopes) from the files instead of
  example markers; parse date stamps properly; don't hard-code exactly two repos (Quiz Repo
  coming); share the counting rules in one place; memoise per-document calculations (every
  table recalculates ~9 times a second during a run).

## Status (2026-11-26, later)

Everything under "Fix now" is fixed, with these notes:

- Electron upgraded from 43.3.0 to 43.8.13: the full audit showed high-severity advisories in
  the Electron runtime itself (it ships inside the app even though npm lists it as a build tool).
  6 moderate advisories remain, all in electron-builder's own tooling (minimatch), which does
  not ship; the only "fix" is a breaking downgrade.
- Electron fuses on: no run-as-Node, no NODE_OPTIONS, no --inspect, asar integrity checking,
  app loads only from its asar, cookies encrypted. `grantFileProtocolExtraPrivileges` is left on
  deliberately: the window loads from file://, and switching it off would stop the app's own
  scripts loading. Verified on a packaged build: ELECTRON_RUN_AS_NODE, ELECTRON_RENDERER_URL,
  NODE_OPTIONS and --inspect are all ignored.
- Copying uses the main process's clipboard, so the window is denied every permission.
- Sheets, Slides and Forms stay tickable in the Drive picker: scripts can be bound to them, and
  picking any file type was an original requirement. A note explains it.
- The two support email addresses stay public: the owner confirmed this on 2026-11-28.
