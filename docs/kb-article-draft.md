# **GAS Updater**

## Draft KB Article

*Draft written during the test build (November 2026). The app's screens and steps are final in design, but the test build uses example data and does not yet connect to Google or GitHub. Anything marked ⏳ describes a part that is not built yet. Links marked **(add link)** are still to be filled in.*

# **Introduction**

The purpose of this tool is to keep the **Blueprint Tools** scripts up to date in every blueprint, without opening each document's Apps Script editor and pasting files in by hand.

Each blueprint carries its own copy of the Blueprint Tools scripts: 13 or more files (a `.gs` file and an `.html` file for each tool, plus `appsscript.json`). When a tool is fixed or improved, every blueprint made before the change keeps the old version. GAS Updater:

* **Checks** any number of blueprints and says which ones are out of date, file by file, against the **Main Repo** and the **Experimental Repo** on GitHub.
* **Updates** the ones you tick, from the repo you choose, either for the whole document or tool by tool.
* **Backs up** each document's current script before changing it, and records every update in the **update history** sheet.

The app changes **only the script** attached to a document. It never changes a document's text, never deletes a document, and never touches a document you did not tick. **Practice run** is on by default, so the first run always shows what *would* happen without changing anything.

**Who it is for:** the people who maintain Blueprint Tools and the blueprint and quiz templates. Most IDCs never need it: the blueprints they work in are kept current by whoever runs it.

**What changed in the latest version** will be listed on the [release page](https://github.com/extrasnow75-bit/GAS-Updater/releases/latest) ⏳, so this article does not carry version history.

# **⚒️The Tool**

GAS Updater is a **desktop app that you install on your computer**, like Canvas Extractor Tools and Canvas Rubric Creator, and it looks and works the same way. It does not require any coding tools or know-how to use.

**Download:** [GAS Updater releases page](https://github.com/extrasnow75-bit/GAS-Updater/releases/latest) ⏳ There is no release yet. Test builds for Windows are on the repo's [Actions page](https://github.com/extrasnow75-bit/GAS-Updater/actions): open the latest **Test build** run and download **GAS-Updater-TEST-BUILD-Windows** under **Artifacts** (you need to be signed in to GitHub).

**On Windows:** double-click the `.exe` to install. **You will see a security warning**: *"Windows protected your PC"*. Click **More info**, then **Run anyway**. The app is distributed directly rather than through the Microsoft Store, so Windows does not recognize the publisher. You will see this again each time you install a new version.

**On a Mac:** ⏳ Mac versions will follow, with the same install steps as the other eCampus apps.

# **🔗Key Documents, Folders and Links**

| What | Link | Notes |
| :---- | :---- | :---- |
| GAS Updater (download) | [Releases page](https://github.com/extrasnow75-bit/GAS-Updater/releases/latest) | ⏳ No release yet. Test builds: [Actions page](https://github.com/extrasnow75-bit/GAS-Updater/actions) |
| GAS Updater (code) | [github.com/extrasnow75-bit/GAS-Updater](https://github.com/extrasnow75-bit/GAS-Updater) | Public |
| Main Repo | [github.com/extrasnow75-bit/blueprint-tools-script](https://github.com/extrasnow75-bit/blueprint-tools-script) | Public. The released Blueprint Tools. Every document starts on this repo. |
| Experimental Repo | [github.com/extrasnow75-bit/blueprint-tools-script-private](https://github.com/extrasnow75-bit/blueprint-tools-script-private) | Private. Tools still being tried out, such as Create Video List. Needs a GitHub token. |
| Backup folder | [Backup folder](https://drive.google.com/drive/folders/1F4ixX07w9DEl9qOyLopGjYYKHLPULdbL) | Before changing any document, the app saves a copy of its current script here. |
| Update history (Google Sheet) | **(add link)** | One row per document per update, plus a tab for each "Export to Google Sheet". If left empty in Initial setup, the app creates "GAS Updater update history" in the backup folder. |
| Multi-semester list (Google Sheet) | **(add link)** | Used by **Add documents → By design cycle** to find each project's blueprint. |
| Blueprint template | [Template Blueprint (TEST COPY)](https://docs.google.com/document/d/1KKlxnDcBXZJ1vrNrVsb_k03CJM7sS8i_m-Bm7LDz4_A/edit) | A test copy for now. Replace with the live template once testing is done. |
| Quiz questions template | [Template Quiz](https://docs.google.com/document/d/140akYR1xZSXZq-2mk0zt5LP0uDtKmCth9BX8Hfs73Bo/edit) | Has no script yet. Quizzes are skipped until a Quiz Repo exists. |
| Apps Script API setting | [script.google.com/home/usersettings](https://script.google.com/home/usersettings) | Turn on **Google Apps Script API** once for each Google account you use with the app. |
| GitHub token instructions | [Creating a fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token) | Only needed for the Experimental Repo. |
| Google Cloud project | **(add link)** | ⏳ Not created yet. Holds the app's Google sign-in settings and its list of test users. |
| Blueprint Tools KB article | [Blueprint Tools](https://boisestateecampus.atlassian.net/wiki/spaces/EKB/pages/5133959171/Blueprint+Tools) | What each tool in the Blueprint Tools menu does. |

## 🔑What You Need Before You Start

**1\. A Google account with edit access to the documents.** The app can only update a document's script if your account can edit that document. You can save **two** Google accounts in the app, for example your Boise State account and a personal one, and switch between them from the account button at the top of the window. Each person signs in with their own account; the app comes with no accounts in it.

**2\. The Apps Script API switched on for that account.** This is a one-time setting per account: open [script.google.com/home/usersettings](https://script.google.com/home/usersettings) and turn on **Google Apps Script API**. Without it, Google refuses every check and update.

**3\. A GitHub token, only for the Experimental Repo.** The Main Repo is public and needs no token. For the Experimental Repo, create a **fine-grained, read-only** token for that one repository, with an expiry date, and paste it into **Initial setup**. It is stored encrypted on your own computer and is sent only to GitHub.

**4\. The documents and folders in Initial setup.** The first time you open the app, the **Initial setup** panel asks for the items in the table above: the multi-semester list, the backup folder, the update history sheet (optional), and the blueprint and quiz questions templates. Each one has a **Choose from Drive** button, or you can paste its address. The panel closes by itself once everything required is set, and you can reopen it from its blue header at any time.

## 🖥️Why a Desktop App?

Updating a script means the app holds a Google sign-in that can change code in many documents, and possibly a GitHub token. Keeping those on your own computer, encrypted in the Windows or macOS keychain and never shown to the window's web page, is much safer than holding them in a browser tab. It is the same approach as Canvas Extractor Tools and Canvas Rubric Creator.

# **🧩Words Used In The App**

| Term | Meaning |
| :---- | :---- |
| **Main Repo** | The public GitHub repository holding the released Blueprint Tools scripts. |
| **Experimental Repo** | The private GitHub repository holding tools still being tried out. |
| **Quiz Repo** | ⏳ A future repository for the quiz questions template's own script. Until it exists, quizzes are skipped. |
| **Tool** | One item in the Blueprint Tools menu. Most tools are a pair of files (for example `Code9.gs` and `Sidebar9.html`), and the pair always moves together. |
| **Permissions** | The `appsscript.json` file, which says what the tools are allowed to do (for example, use Google Sheets). |
| **Practice run** | Goes through every step, including the backup check, but changes nothing. On by default. |
| **"Last updated" stamp** | The date and time written near the top of every Blueprint Tools file, e.g. *Last updated on 2026-09-12 at 21:14 MDT*. |

# **✅What The App Does**

## Check

Check compares each ticked document's script with the Main Repo and the Experimental Repo (you can untick either one under **Check compares with**). Files are compared by their **content**, not their dates, so a file someone edited inside a document without changing its date is still caught.

Each document gets a status:

| Status | Meaning |
| :---- | :---- |
| **Up to date** | Matches the Main Repo exactly. |
| **Out of date** | Differs from the Main Repo. A line underneath says how, for example *Matches the Experimental Repo exactly, but is behind the Main Repo*. |
| **No Quiz Repo yet** | A quiz. Skipped until a Quiz Repo exists. |
| **No permission** | You can view the document but not edit it. |
| **Script not found** | The app could not find the document's script. See Troubleshooting. |

Out-of-date documents are ticked for you. The **Check Timeline** at the bottom lists each document, in green, amber or red.

## Choose where each document updates from

Under each out-of-date blueprint:

* **Update from: Main Repo · Experimental Repo** sets the choice for the whole document. To set many documents at once, use **Update every ticked blueprint from** at the top of the list.
* **Tools and files** opens a table with one block per tool, showing each file's "Last updated" date in the document, in the Main Repo and in the Experimental Repo. Each tool has a choice of **Keep · Main Repo · Experimental Repo** (or **Don't add**, if the document does not have that tool yet). Once tools are mixed, the line says **Mixed**.
* Tags in the table say what kind of difference each file has:

| Tag | Meaning |
| :---- | :---- |
| **Newer in GitHub** | The document is behind. The usual case. |
| **Not in document** | A newer tool the document does not have yet. |
| **Not in Main Repo** | The document has a file the Main Repo does not. |
| **Document is newer** | Updating would go backwards. The app starts these on **Keep**. |
| **Same date, different content** | Someone edited the file inside the document without changing its date. |

**Safe starting choices:** a tool that is newer in the document than in the chosen repo starts on **Keep**, so an update never goes backwards unless you choose it.

**Warnings:** if a choice would break a tool, an amber box explains the problem and offers buttons that fix it. For example, choosing the Experimental Repo's Create Video List with the Main Repo's menu would leave the tool with no menu item. A document with an unfixed warning is skipped.

## Update

**Update selected** opens a summary of exactly what will change in each document: which tools come from which repo, what is kept and what is removed. With **Practice run** off, the dialog turns red, says **for real**, and asks you to tick **I understand** first.

For each document the app then:

1. Saves a backup of the current script in the backup folder, named like *BIOL 1010 Blueprint script backup 2026-11-25 14.14*.
2. Replaces the script with the files you chose.
3. Reads the script back and checks every file against GitHub.

The **Update Timeline** shows one line per file per document: updated, added, removed or unchanged, which repo it came from, and its "Last updated" stamp.

## Results

* **Copy results** copies a table (one row per file per document) that pastes into any Google Sheet or Doc.
* **Export to Google Sheet** adds a tab with the same table to the update history sheet. ⏳ In the test build this shows a preview instead.
* **Open the update history** and **Open backup** links take you to the sheet and the backups.

If permissions change (for example, a tool now needs Google Sheets access), the app warns you before updating: people who open that blueprint will be asked by Google to allow the new access the next time they use the Blueprint Tools menu.

# **🛑What The App Does Not Do**

* Change a document's text, formatting or tabs. Only the attached script changes.
* Delete documents, or touch documents you did not tick.
* Update quizzes. ⏳ Not until the quiz questions template has a script and a Quiz Repo exists.
* Add a script to a document that has none.
* Undo an update with one click. ⏳ A **Restore from backup** button is planned; until then, see **Putting a backup back** below.

# **📋How To Use It**

**First run only:** complete **Initial setup**: sign in with Google, add a GitHub token if you need the Experimental Repo, and choose the Google files and templates.

**Every run:**

1. **Add documents** in any of three ways: **By design cycle** (from the multi-semester list), **Choose documents from Drive** (tick whole folders or single files; step 2 shows what is inside the folders), or paste document addresses, one per line. The list never holds duplicates.
2. Click **Check selected** in the bar at the bottom of the window.
3. Look at each out-of-date document. Change **Update from**, or open **Tools and files** to choose tool by tool. Fix any amber warning.
4. Leave **Practice run** on and click **Update selected (practice)**. Read the summary and the timeline.
5. When it looks right, click **Update for real…** in the results, tick **I understand**, and click **Update for real**.
6. Use **Copy results** or **Export to Google Sheet** if you want a record beyond the automatic update history.

Every file in the app has an **Open ↗** link that opens it in your web browser, so you can make sure it is the right document. Opening a link never ticks or changes anything.

# **♻️Putting A Backup Back**

⏳ Until the **Restore from backup** button exists:

1. Open the [backup folder](https://drive.google.com/drive/folders/1F4ixX07w9DEl9qOyLopGjYYKHLPULdbL) and find the document's backup by name and time.
2. Open the document, then **Extensions → Apps Script**.
3. Replace each file's contents with the version from the backup, and save.

# **🔧Troubleshooting**

| What you see | What to do |
| :---- | :---- |
| **No permission**: "You can view this document but not edit it" | Ask the document's owner for edit access, or switch to the Google account that has it, then run Check again. |
| **Script not found** | Open the document once in your browser (this lets it record its own script ID), then run Check again. Blueprints made before this feature may need this once. |
| An amber warning under a document | Choose one of the buttons in the warning. The document is skipped until you do. |
| "Apps Script API has not been used in project … or it is disabled" | Turn on **Google Apps Script API** at [script.google.com/home/usersettings](https://script.google.com/home/usersettings) for the account you are using, wait a minute, and try again. |
| The Experimental Repo says **Needs token**, or the token is rejected | Create a new fine-grained, read-only token for the Experimental Repo and save it in **Initial setup**. Tokens expire. |
| Google sign-in stops working, or asks again after about a week | ⏳ Expected while the app is in Google's testing mode: Google ends sign-ins weekly. Sign in again from **Initial setup**. |
| Google shows a warning screen the first time you sign in | Click **Advanced**, then **Go to GAS Updater**. The app has not been through Google's public review, which is not required for internal use. |
| Google sign-in fails saying the app is not verified, and there is no **Advanced** link | Your Google account is not on the app's test-user list. Contact Greg Snow (gregsnow@boisestate.edu or extrasnow75@gmail.com). |
| Users of a blueprint are asked to allow new access | Expected after an update that changed **Permissions**. They click **Allow** once. |
| Windows says "Windows protected your PC" | Click **More info**, then **Run anyway**. See **The Tool** above. |
| Text is too small to read | Use the **Text size** buttons at the top of the window. **Ctrl** and **+** or **−** do the same, and **Ctrl 0** resets. |
| Something failed and you need help | Click **Copy Logs** in the timeline header, or **Show technical details** under the error, and send it to Greg Snow (gregsnow@boisestate.edu or extrasnow75@gmail.com). |

# **🔄Updates**

⏳ The app will check for a newer version when it starts, as the other eCampus apps do. Updates are never installed automatically. Download the new version and install it over the top of the old one; your Google sign-ins and GitHub token are kept.

**On Windows: do not uninstall the old version first, and accept the folder the installer offers.** Close GAS Updater before you run the installer.

# **📄Related References**

* [Blueprint Tools](https://boisestateecampus.atlassian.net/wiki/spaces/EKB/pages/5133959171/Blueprint+Tools): the tools whose scripts this app keeps up to date
* [Canvas Extractor Tools](https://github.com/extrasnow75-bit/canvas-extractor-tools) and [Canvas Rubric Creator](https://github.com/extrasnow75-bit/Rubric-Creator-Desktop-App): the other eCampus desktop apps, which work the same way
* [Template Quiz](https://docs.google.com/document/d/140akYR1xZSXZq-2mk0zt5LP0uDtKmCth9BX8Hfs73Bo/edit): the quiz questions template
* Template Blueprint (live) **(add link)**

# **💭Feedback**

To request a feature or report a bug, use the App Suggestions Document **(add link)**, or contact Greg Snow (gregsnow@boisestate.edu or extrasnow75@gmail.com).

---

# **🔩Maintenance**

*Audience: whoever takes over this app. You need to be comfortable installing things, running commands, and reading code with an AI assistant's help. This section explains **why** things are the way they are.*

## Getting it running

**Repo:** [github.com/extrasnow75-bit/GAS-Updater](https://github.com/extrasnow75-bit/GAS-Updater)

You need [Node.js](https://nodejs.org) (the LTS version) and git. Then:

```
git clone https://github.com/extrasnow75-bit/GAS-Updater.git
cd GAS-Updater
npm install
npm run dev
```

| Command | What it does |
| :---- | :---- |
| `npm run dev` | Run the app locally with live reload |
| `npm run typecheck` | Check for type errors. **Run this before committing.** |
| `npm test` | Run the tests. **Also run this before committing.** |
| `npm run build` | Build a real installer into `release/` |

Every push to a `claude/` branch builds a Windows test installer on GitHub Actions (`.github/workflows/test-build.yml`). ⏳ A release workflow, triggered by a version tag, will follow the one in Canvas Extractor Tools.

## How the app is put together

It is an **Electron** app, built the same way as Canvas Extractor Tools:

| | What it is | Where it lives |
| :---- | :---- | :---- |
| **Main process** | The Node.js half. Holds sign-ins and tokens; makes every Google and GitHub call. | `electron/` |
| **Window (renderer)** | The user interface: React and Tailwind. Sandboxed, with no network access. | `src/` |

The window asks the main process to do things through a short, fixed list of requests in `electron/preload.ts`. The comparison and choice rules are plain functions in `src/logic/compare.ts`, tested in `src/logic/compare.test.ts`. `src/logic/exampleData.ts` holds the test build's example data and goes away when the real connections arrive.

## Rules not to break

1. **Tokens never reach the window.** Google and GitHub tokens stay in the main process. The window's security policy (`connect-src 'none'`) means it cannot make network calls at all; keep it that way.
2. **Only write to documents chosen in this session**, and before writing, confirm the script really belongs to that document (the Apps Script API's `parentId`). Back up first, and stop the batch on the first unexpected failure.
3. **Update from a fixed version, not "whatever is on main right now".** A compromised repo or token would otherwise push bad code into every blueprint. Record the commit in the update history, and keep both repos' main branches protected (required review, no force-pushes).
4. **Treat any change to `appsscript.json` permissions as needing its own approval.**
5. **Keep the Electron fuses** in `package.json` (`electronFuses`). They stop other programs on the computer from running code as GAS Updater. `grantFileProtocolExtraPrivileges` is deliberately left on: the window loads from `file://` and needs it.
6. **No secrets in this repo or in the test-build workflow.** It is public, and anyone who can push a `claude/` branch can run that workflow.

## Where decisions are recorded

* `docs/decisions.md`: every design decision, with the reason.
* `docs/reviews/`: code, accessibility, security and usability reviews, and what was fixed.
* `mockups/`: the clickable design mockups the app was built from.
* `spike/`: the Phase 0 feasibility test script (run against TEST COPY documents only).
