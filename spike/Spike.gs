/**
 * GAS Updater — Phase 0 feasibility spike (throwaway).
 *
 * Run ONLY against COPIES in the extrasnow75 Drive. Every test that writes refuses to run
 * unless the document's name contains "TEST COPY" (see COPY_MARKER below).
 *
 * How to use: see spike/README.md. In short, fill in CONFIG, then run the tests one at a time
 * from the Apps Script editor (choose the function name in the toolbar, press Run) and read
 * the results in the Execution log.
 *
 * Messages follow the Extractor Tools rules: say what happened in plain words, what it means,
 * and what to do next. The technical cause comes last, after "Details for support:".
 */

// ---------------------------------------------------------------------------------------------
// CONFIG — fill these in before running.
// ---------------------------------------------------------------------------------------------
const CONFIG = {
  // A COPY of a blueprint (Google Doc). The ID is the long part of the address between /d/ and /edit.
  DOC_ID: '',
  // The ID of that copy's script. Open the copy, choose Extensions > Apps Script, and copy the
  // long part of the editor's address between /projects/ and /edit.
  DOC_SCRIPT_ID: '',

  // Optional, for test 4: copies of a Sheet, a Form and a Slides file, each with a bound script.
  OTHER_TYPES: [
    // { label: 'Sheet', fileId: '', scriptId: '' },
    // { label: 'Form', fileId: '', scriptId: '' },
    // { label: 'Slides', fileId: '', scriptId: '' },
  ],
};

/** A file's name must contain this before any test will write to its script. */
const COPY_MARKER = 'TEST COPY';

/** The extra file test 2 adds to the copy's script. */
const STAMP_FILE_NAME = 'GasUpdaterStamp';

/** The named range the stamp writes. The script ID follows the colon. */
const STAMP_PREFIX = 'GAS_UPDATER_SCRIPT_ID:';

// ---------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------

/** Test 1: can the app READ the script bound to the blueprint copy? */
function test1_readScript() {
  requireConfig_();
  const project = scriptApi_('GET', CONFIG.DOC_SCRIPT_ID, '', null, 'reading the script’s details');
  const content = scriptApi_('GET', CONFIG.DOC_SCRIPT_ID, '/content', null, 'reading the script’s files');

  report_('Test 1 passed: the script could be read.', [
    `Script title: ${project.title}`,
    `Belongs to the document: ${project.parentId === CONFIG.DOC_ID ? 'yes (matches DOC_ID)' : 'NO — it belongs to ' + project.parentId}`,
    `Files (${content.files.length}):`,
    ...content.files.map((f) => `  ${f.name} (${f.type}, ${f.source.length} characters, hash ${hash_(f.source)})`),
  ]);
}

/**
 * Test 2: can the app WRITE the script? Adds one small file (the self-stamp test), re-reads the
 * script and checks every file came back exactly as sent. Makes a version snapshot first, so the
 * copy can be rolled back from the script editor's version history.
 */
function test2_writeScript() {
  requireConfig_();
  requireCopy_(CONFIG.DOC_ID);

  const before = scriptApi_('GET', CONFIG.DOC_SCRIPT_ID, '/content', null, 'reading the script’s files');
  const version = scriptApi_('POST', CONFIG.DOC_SCRIPT_ID, '/versions',
    { description: 'GAS Updater spike: before test 2' }, 'saving a version snapshot');

  const files = before.files
    .filter((f) => f.name !== STAMP_FILE_NAME)
    .map((f) => ({ name: f.name, type: f.type, source: f.source }));
  files.push({ name: STAMP_FILE_NAME, type: 'SERVER_JS', source: stampSource_() });

  scriptApi_('PUT', CONFIG.DOC_SCRIPT_ID, '/content', { files: files }, 'writing the script’s files');
  const after = scriptApi_('GET', CONFIG.DOC_SCRIPT_ID, '/content', null, 'checking the script after writing');

  const mismatches = files.filter((sent) => {
    const got = after.files.find((f) => f.name === sent.name && f.type === sent.type);
    return !got || hash_(got.source) !== hash_(sent.source);
  });

  report_(mismatches.length === 0
    ? 'Test 2 passed: the script was written and every file matches what was sent.'
    : 'Test 2 FAILED: the script was written, but some files do not match what was sent.', [
    `Version snapshot made first: version ${version.versionNumber}`,
    `Files before: ${before.files.length}. Files after: ${after.files.length}.`,
    ...mismatches.map((f) => `  Does not match: ${f.name}`),
    '',
    'Next, for test 5: open the copy’s script editor (Extensions > Apps Script), open the',
    `${STAMP_FILE_NAME} file, choose gasUpdaterStamp in the toolbar and press Run.`,
  ]);
}

/**
 * Test 3: can the bound script be FOUND from the document's ID alone?
 * Tries the two Drive searches that would work if bound scripts showed up in Drive.
 */
function test3_findScriptFromDocument() {
  requireConfig_();
  const docName = driveGet_(CONFIG.DOC_ID).name;
  const byParent = driveList_(`'${CONFIG.DOC_ID}' in parents and trashed = false`);
  const byType = driveList_(`mimeType = 'application/vnd.google-apps.script' and trashed = false`);
  const found = byParent.concat(byType).some((f) => f.id === CONFIG.DOC_SCRIPT_ID);

  report_(found
    ? 'Test 3: the bound script WAS found by searching Drive. The document ID alone is enough.'
    : 'Test 3: the bound script was NOT found by searching Drive, as expected. A stamp or registry is needed.', [
    `Document: ${docName}`,
    `Files Drive lists inside the document: ${byParent.length}`,
    `Script files Drive lists in your Drive: ${byType.length} (bound scripts would appear here if Drive listed them)`,
  ]);
}

/** Test 4: do Sheets, Forms and Slides behave the same? Read-only. */
function test4_otherFileTypes() {
  if (CONFIG.OTHER_TYPES.length === 0) {
    throw new Error('Test 4 has nothing to check. Add a copy of a Sheet, Form or Slides file to OTHER_TYPES in CONFIG and run it again.');
  }
  const lines = CONFIG.OTHER_TYPES.map((t) => {
    try {
      const project = scriptApi_('GET', t.scriptId, '', null, `reading the ${t.label} script’s details`);
      const content = scriptApi_('GET', t.scriptId, '/content', null, `reading the ${t.label} script’s files`);
      const owns = project.parentId === t.fileId ? 'belongs to the file' : 'does NOT belong to the file';
      return `${t.label}: read OK, ${content.files.length} files, ${owns}.`;
    } catch (e) {
      return `${t.label}: ${e.message}`;
    }
  });
  report_('Test 4 results by file type:', lines);
}

/**
 * Test 5: after running gasUpdaterStamp in the copy (see test 2), can the app read the stamp
 * from OUTSIDE, and does the stamped script really belong to this document?
 */
function test5_readStamp() {
  requireConfig_();
  const doc = docsGet_(CONFIG.DOC_ID);
  const stamps = (doc.namedRanges ? Object.keys(doc.namedRanges) : []).filter((n) => n.indexOf(STAMP_PREFIX) === 0);
  if (stamps.length === 0) {
    throw new Error('Test 5 found no stamp in the document. Run test 2, then run gasUpdaterStamp in the copy’s script editor, and try again.');
  }
  const scriptId = stamps[0].slice(STAMP_PREFIX.length);
  const project = scriptApi_('GET', scriptId, '', null, 'checking the stamped script');
  report_(project.parentId === CONFIG.DOC_ID
    ? 'Test 5 passed: the stamp was read from outside, and the stamped script belongs to this document.'
    : 'Test 5: a stamp was found, but the stamped script belongs to a different document (a stale stamp from copying).', [
    `Stamped script ID: ${scriptId}`,
    `Matches DOC_SCRIPT_ID: ${scriptId === CONFIG.DOC_SCRIPT_ID ? 'yes' : 'no'}`,
  ]);
}

// ---------------------------------------------------------------------------------------------
// The stamp that test 2 adds to the copy. In the real template it would be called from onOpen.
// ---------------------------------------------------------------------------------------------

function stampSource_() {
  return [
    '/** GAS Updater spike: records this script\'s ID in the document so it can be found from outside. */',
    'function gasUpdaterStamp() {',
    `  var PREFIX = '${STAMP_PREFIX}';`,
    '  var doc = DocumentApp.getActiveDocument();',
    '  var name = PREFIX + ScriptApp.getScriptId();',
    '  doc.getNamedRanges().forEach(function (r) {',
    '    if (r.getName().indexOf(PREFIX) === 0 && r.getName() !== name) r.remove();',
    '  });',
    '  if (doc.getNamedRanges(name).length === 0) {',
    '    var body = doc.getBody();',
    '    doc.addNamedRange(name, doc.newRange().addElement(body.getChild(0)).build());',
    '  }',
    '  Logger.log(\'Stamped: \' + name);',
    '}',
  ].join('\n');
}

// ---------------------------------------------------------------------------------------------
// Google requests and their messages
// ---------------------------------------------------------------------------------------------

const SUPPORT_CONTACT = 'Greg Snow (gregsnow@boisestate.edu or extrasnow75@gmail.com)';
const ASK_SUPPORT = `If it keeps happening, contact ${SUPPORT_CONTACT}.`;

function details_(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 300);
  return clean ? ` Details for support: ${clean}` : '';
}

/** A failed Apps Script API request, in plain words. `doing` finishes "while …". */
function scriptApiMessage_(doing, status, body) {
  const tail = details_(`Apps Script API ${status}. ${body}`);
  // The person has not switched the API on in their own Apps Script settings.
  if (status === 403 && /User has not enabled the Apps Script API/i.test(body)) {
    return 'Your Google account does not allow apps to change Apps Script projects yet. ' +
      'Open https://script.google.com/home/usersettings, turn on “Google Apps Script API”, wait a few minutes, and try again.' + tail;
  }
  // The Cloud project linked to this script does not have the API switched on.
  if (status === 403 && /SERVICE_DISABLED|has not been used in project|it is disabled/i.test(body)) {
    return 'The Apps Script API is not switched on in this app’s Google Cloud project. ' +
      'Open the Google Cloud console for the project, enable “Apps Script API”, wait a few minutes, and try again.' + tail;
  }
  if (status === 403 && /insufficient|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(body)) {
    return 'This script was not given permission to read and change Apps Script projects. ' +
      'Check that appsscript.json lists the script.projects permission, run the test again, and allow access when Google asks.' + tail;
  }
  if (status === 403 || status === 404) {
    return `Google would not let you do that while ${doing}. Check that the script ID is right and that you can edit the document. ${ASK_SUPPORT}` + tail;
  }
  if (status === 429) return 'Google is busy right now. Wait a minute and try again.' + tail;
  if (status >= 500) return 'Google is having a problem right now. Wait a few minutes and try again.' + tail;
  return `Something went wrong while ${doing}. Please try again. ${ASK_SUPPORT}` + tail;
}

function scriptApi_(method, scriptId, path, payload, doing) {
  return request_(`https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}${path}`, method, payload,
    (status, body) => scriptApiMessage_(doing, status, body));
}

function driveGet_(fileId) {
  return request_(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType&supportsAllDrives=true`,
    'GET', null, (status, body) => `Google Drive could not find the document. Check DOC_ID in CONFIG.${details_(`Drive ${status}. ${body}`)}`);
}

function driveList_(q) {
  const url = 'https://www.googleapis.com/drive/v3/files?pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true' +
    '&fields=files(id,name,mimeType)&q=' + encodeURIComponent(q);
  return request_(url, 'GET', null,
    (status, body) => `Google Drive could not search your files. ${ASK_SUPPORT}${details_(`Drive ${status}. ${body}`)}`).files || [];
}

function docsGet_(docId) {
  return request_(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}?fields=namedRanges`, 'GET', null,
    (status, body) => `Google Docs could not open the document. Check DOC_ID in CONFIG.${details_(`Docs ${status}. ${body}`)}`);
}

function request_(url, method, payload, messageFor) {
  const options = {
    method: method,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  let response;
  try {
    response = UrlFetchApp.fetch(url, options);
  } catch (e) {
    throw new Error('The script could not reach Google. Try again in a minute.' + details_(e.message));
  }
  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status >= 200 && status < 300) return body ? JSON.parse(body) : {};
  throw new Error(messageFor(status, body));
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

function requireConfig_() {
  if (!CONFIG.DOC_ID || !CONFIG.DOC_SCRIPT_ID) {
    throw new Error('Fill in DOC_ID and DOC_SCRIPT_ID at the top of Spike.gs, save, and run the test again.');
  }
}

/** Refuses to write unless the file's name says it is a test copy. */
function requireCopy_(fileId) {
  const name = driveGet_(fileId).name;
  if (name.indexOf(COPY_MARKER) === -1) {
    throw new Error(`Stopped before changing anything: “${name}” does not have “${COPY_MARKER}” in its name, ` +
      `so it may not be a copy. Rename the copy to include “${COPY_MARKER}” and run the test again.`);
  }
}

/** Content hash, so files are compared by what they contain, not by dates. */
function hash_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map((b) => ((b + 256) % 256).toString(16).padStart(2, '0')).join('').slice(0, 12);
}

function report_(headline, lines) {
  Logger.log([headline, ...lines].join('\n'));
}
