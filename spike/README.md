# Phase 0 test script: how to run it

This is a throwaway script that checks whether GAS Updater can work at all. Nothing in it
touches a live project: the tests that change anything stop unless the document's name contains
**TEST COPY**.

## 1. Make the test copies (in the extrasnow75 Drive)

1. Make a copy of the blueprint template. Rename it so it includes `TEST COPY`.
2. Optional (test 4): make a copy of a Sheet, a Form and a Slides file that each have a script
   (Extensions > Apps Script). Rename each to include `TEST COPY`.
3. For each copy, write down two IDs:
   - **File ID**: the long part of the file's address between `/d/` and `/edit`.
   - **Script ID**: open the copy, choose Extensions > Apps Script, and copy the long part of
     the editor's address between `/projects/` and `/edit`.

## 2. Set up Google Cloud (one time)

1. Go to https://console.cloud.google.com and create a project called `GAS Updater`.
2. In that project, open **APIs & Services > Library** and enable **Apps Script API**,
   **Google Drive API** and **Google Docs API**.
3. Open **APIs & Services > OAuth consent screen**. Choose **External**, leave it in
   **Testing**, and add your own Google account under **Test users**.
4. On the project's home page, copy the **Project number** (digits only).
5. Go to https://script.google.com/home/usersettings and turn on **Google Apps Script API**.

## 3. Make the test script

1. Go to https://script.google.com and choose **New project**. Name it `GAS Updater spike`.
2. Open **Project Settings** (gear icon):
   - Tick **Show "appsscript.json" manifest file in editor**.
   - Under **Google Cloud Platform (GCP) Project**, choose **Change project** and paste the
     project number from step 2.4.
3. Back in the editor, replace the contents of `appsscript.json` with this folder's
   `appsscript.json`, and the contents of `Code.gs` with `Spike.gs`.
4. Fill in `CONFIG` at the top with the IDs from step 1. Save.

## 4. Run the tests, one at a time

Choose the function name in the toolbar, press **Run**, and read the **Execution log**. The first
run asks for permission: allow it (Google will warn that the app is unverified; choose
Advanced, then continue, since it is your own script).

| Test | What it checks | Changes anything? |
| --- | --- | --- |
| `test1_readScript` | Can the blueprint copy's script be read? | No |
| `test2_writeScript` | Can it be written? Adds one small file, then checks every file. Saves a version snapshot first. | Yes, the copy's script only |
| `test3_findScriptFromDocument` | Can the script be found from the document ID alone? | No |
| `test4_otherFileTypes` | Do Sheets, Forms and Slides behave the same? | No |
| `test5_readStamp` | Run after test 2 **and** after running `gasUpdaterStamp` in the copy's script editor. Can the app read the script ID the copy recorded in itself? | No |

Paste the log from each test back to Claude, including any message that says "Details for
support".
