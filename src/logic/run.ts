/**
 * What Check and Update report, as timeline lines, counts and per-document results. TEST BUILD:
 * the work itself is simulated; the wording and colours follow the Rubric Creator app's
 * Analyze & Deploy timeline (green success, red failure, amber "what to do").
 */
import { ACCOUNTS, SUPPORT_CONTACT, type DocStatus, type ExampleDoc } from './exampleData'
import {
  DEFAULT_CHOICE,
  REPO_LONG,
  REPO_NAME,
  cmpCounts,
  finalFiles,
  plan,
  warnings,
  type DocChoice,
  type FileSet,
  type PlanRow,
  type RepoKey,
  type Repos,
} from './compare'

export type LineKind = 'info' | 'success' | 'error' | 'warning'
export interface Line {
  /** Empty for the per-file detail lines, which sit under their document's line. */
  ts: string
  msg: string
  kind: LineKind
}

export interface ListDoc extends ExampleDoc {
  checked: boolean
}

export const NO_EDIT_ACCESS = (name: string) =>
  `You can view ${name} but not edit it, so its script could not be changed. Ask the document’s owner for edit access, then try again. If it keeps happening, contact ${SUPPORT_CONTACT}. Details for support: Apps Script API 403 PERMISSION_DENIED: The caller does not have permission. (test build example)`

/** The repo a document's "Up to date" is measured against: the Main Repo when it is compared. */
export const primaryRepo = (compared: RepoKey[]): RepoKey => (compared.includes('main') || !compared.length ? 'main' : compared[0])

/** The status chip for a document once it has been checked. */
export function checkedStatus(d: ExampleDoc, repos: Repos, compared: RepoKey[]): DocStatus {
  if (!d.files) return d.status
  return cmpCounts(d.files, repos[primaryRepo(compared)]).length ? 'out' : 'ok'
}

/** A plain line under the document saying what its status means. */
export function checkedNote(d: ExampleDoc, repos: Repos, compared: RepoKey[]): string {
  if (!d.files) return d.note
  const primary = primaryRepo(compared)
  if (!cmpCounts(d.files, repos[primary]).length) return `Matches the ${REPO_NAME[primary]} exactly`
  const match = compared.find((r) => r !== primary && !cmpCounts(d.files!, repos[r]).length)
  if (match) return `Matches the ${REPO_NAME[match]} exactly, but is behind the ${REPO_NAME[primary]}`
  return d.note
}

export interface CheckCounts {
  total: number
  need: number
  upToDate: number
  cannot: number
  skipped: number
  cannotNames: { perm: string[]; none: string[] }
}

/** One set of counts, used by the timeline, the summary card and the status line alike. */
export function checkCounts(docs: ExampleDoc[], repos: Repos, compared: RepoKey[]): CheckCounts {
  const c: CheckCounts = { total: docs.length, need: 0, upToDate: 0, cannot: 0, skipped: 0, cannotNames: { perm: [], none: [] } }
  for (const d of docs) {
    if (d.type === 'Quiz') c.skipped++
    else if (d.status === 'perm') (c.cannot++, c.cannotNames.perm.push(d.name))
    else if (d.status === 'none' || !d.files) (c.cannot++, c.cannotNames.none.push(d.name))
    else if (checkedStatus(d, repos, compared) === 'ok') c.upToDate++
    else c.need++
  }
  return c
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** "Checked 7 documents: 3 need updating, 2 could not be checked, 2 skipped (no Quiz Repo yet)." */
export function checkSentence(c: CheckCounts): string {
  const parts = [`${c.need} need${c.need === 1 ? 's' : ''} updating`]
  if (c.upToDate) parts.push(`${c.upToDate} up to date`)
  if (c.cannot) parts.push(`${c.cannot} could not be checked`)
  if (c.skipped) parts.push(`${c.skipped} skipped (no Quiz Repo yet)`)
  return `Checked ${plural(c.total, 'document')}: ${parts.join(', ')}.`
}

/** "2026-11-25 14:14" in the computer's own time zone. */
export const localStamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export function checkLines(docs: ExampleDoc[], repos: Repos, compared: RepoKey[], now = new Date()): Line[] {
  const ts = clock(now)
  const against = compared.map((r) => `the ${REPO_NAME[r]}`).join(' and ')
  const L: Line[] = [{ ts, msg: `Checking ${plural(docs.length, 'document')} against ${against}…`, kind: 'info' }]
  for (const d of docs) {
    if (d.type === 'Quiz') L.push({ ts, msg: `"${d.name}" skipped: there is no Quiz Repo yet`, kind: 'warning' })
    else if (d.status === 'perm') {
      L.push({ ts, msg: `✗ "${d.name}" could not be checked: you can view this document but not edit it`, kind: 'error' })
      L.push({ ts: '', msg: 'Ask the document’s owner for edit access, then run Check again.', kind: 'warning' })
    } else if (d.status === 'none' || !d.files) {
      L.push({ ts, msg: `✗ "${d.name}" could not be checked: its script was not found`, kind: 'error' })
      L.push({ ts: '', msg: 'Open the document once so its script can be found, or paste its script ID.', kind: 'warning' })
    } else if (checkedStatus(d, repos, compared) === 'ok') {
      L.push({ ts, msg: `✓ "${d.name}" ${checkedNote(d, repos, compared).replace(/^M/, 'm')}`, kind: 'success' })
    } else {
      const behind = compared.filter((r) => cmpCounts(d.files!, repos[r]).length).map((r) => `the ${REPO_NAME[r]}`)
      const match = compared.find((r) => !cmpCounts(d.files!, repos[r]).length)
      L.push({ ts, msg: `"${d.name}" is out of date with ${behind.join(' and ')}${match ? ` (it matches the ${REPO_NAME[match]} exactly)` : ''}`, kind: 'warning' })
    }
  }
  const c = checkCounts(docs, repos, compared)
  L.push({ ts, msg: checkSentence(c), kind: c.cannot ? 'warning' : 'success' })
  return L
}

export type DocResult = 'done' | 'blocked' | 'nochange' | 'error' | 'skipped'
export interface UpdateOutcome {
  id: string
  result: DocResult
  message?: string
  rows: PlanRow[]
  after?: FileSet
}

export function outcomeFor(d: ExampleDoc, repos: Repos, choice: DocChoice = DEFAULT_CHOICE): UpdateOutcome {
  if (d.type === 'Quiz') return { id: d.id, result: 'skipped', message: 'Skipped: there is no Quiz Repo yet.', rows: [] }
  if (d.status === 'perm') return { id: d.id, result: 'error', message: NO_EDIT_ACCESS(d.name), rows: [] }
  if (d.status === 'none' || !d.files) return { id: d.id, result: 'skipped', message: 'Skipped: its script was not found.', rows: [] }
  const W = warnings(d.files, repos, choice)
  if (W.length) return { id: d.id, result: 'blocked', message: W[0].msg, rows: [] }
  const rows = plan(d.files, repos, choice)
  if (!rows.some((r) => r.res !== 'unchanged')) return { id: d.id, result: 'nochange', rows }
  return { id: d.id, result: 'done', rows, after: finalFiles(d.files, repos, choice) }
}

export function backupName(name: string, now: Date) {
  return `${name} script backup ${localStamp(now).replace(':', '.')}`
}

export function updateLines(docs: ExampleDoc[], outcomes: Map<string, UpdateOutcome>, practice: boolean, now = new Date()): Line[] {
  const ts = clock(now)
  const L: Line[] = [{ ts, msg: `${practice ? 'Practice run: nothing will be changed. ' : ''}Updating ${plural(docs.length, 'document')}, using your choices in the documents list…`, kind: 'info' }]
  let changed = 0
  let total = 0
  let ok = 0
  let failed = 0
  for (const d of docs) {
    const o = outcomes.get(d.id)!
    if (o.result === 'skipped') { L.push({ ts, msg: `"${d.name}" ${o.message!.charAt(0).toLowerCase()}${o.message!.slice(1)}`, kind: 'warning' }); continue }
    if (o.result === 'blocked') { L.push({ ts, msg: `"${d.name}" skipped: it needs a choice first. ${o.message}`, kind: 'warning' }); continue }
    if (o.result === 'nochange') { L.push({ ts, msg: `"${d.name}" skipped: nothing to update with the choices made`, kind: 'info' }); continue }
    if (o.result === 'error') {
      failed++
      L.push({ ts, msg: `Updating "${d.name}"…`, kind: 'info' })
      L.push({ ts, msg: `✗ "${d.name}" failed: you can view this document but not edit it. No files were changed.`, kind: 'error' })
      L.push({ ts: '', msg: 'Ask the document’s owner for edit access, then try again.', kind: 'warning' })
      continue
    }
    ok++
    L.push({ ts, msg: `Updating "${d.name}"…`, kind: 'info' })
    L.push({ ts: '', msg: `Backup ${practice ? 'would be ' : ''}saved: "${backupName(d.name, now)}"`, kind: 'info' })
    let n = 0
    for (const r of o.rows) {
      const ch = r.res !== 'unchanged'
      if (ch) n++
      total++
      const what = ch ? `${practice ? 'would be ' : ''}${r.res}${r.res !== 'removed' && (r.src === 'main' || r.src === 'exp') ? ` from the ${REPO_NAME[r.src]}` : ''}` : 'unchanged'
      L.push({ ts: '', msg: `${ch ? '✓' : '·'} ${r.f}: ${what} (${r.stamp ? 'last updated ' + r.stamp : 'no date stamp'})`, kind: ch ? 'success' : 'info' })
    }
    changed += n
    L.push({
      ts,
      msg: practice
        ? `✓ "${d.name}" practice run finished: ${plural(n, 'file')} would change, ${o.rows.length - n} unchanged`
        : `✓ "${d.name}" updated successfully: ${plural(n, 'file')} changed, ${o.rows.length - n} unchanged, checked against GitHub`,
      kind: 'success',
    })
  }
  L.push({
    ts,
    msg: practice
      ? `Practice run: ${plural(ok, 'document')} would be updated (${plural(total, 'file')}: ${changed} would change, ${total - changed} unchanged). Nothing was changed.`
      : `${plural(ok, 'document')} successfully updated (${plural(total, 'file')}: ${changed} changed, ${total - changed} unchanged).`,
    kind: 'success',
  })
  if (failed) L.push({ ts, msg: `${plural(failed, 'document')} could not be updated.`, kind: 'warning' })
  return L
}

export const EXPORT_HEADERS = ['Uploaded', 'Google account', 'Blueprint', 'Address', 'Repo', 'File', 'File’s “Last updated”', 'Result', 'Backup']

/** One row per file per updated document; the account is the one each document came from. */
export function exportRows(docs: ExampleDoc[], outcomes: Map<string, UpdateOutcome>, practice: boolean, now = new Date()): string[][] {
  const when = localStamp(now)
  const rows: string[][] = []
  for (const d of docs) {
    const o = outcomes.get(d.id)
    if (!o) continue
    const account = ACCOUNTS[d.account].email
    if (o.result === 'done')
      for (const r of o.rows)
        rows.push([
          when,
          account,
          d.name,
          d.url,
          REPO_LONG[r.src],
          r.f,
          r.stamp || '(none)',
          practice && r.res !== 'unchanged' ? `Would be ${r.res}` : r.res[0].toUpperCase() + r.res.slice(1),
          practice ? '(practice run: no backup)' : backupName(d.name, now),
        ])
    else if (o.result === 'error') rows.push([when, account, d.name, d.url, '', '', '', 'Failed: no edit access', ''])
  }
  return rows
}

const DOC_URL = /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation|forms)\/d\/([A-Za-z0-9_-]{10,})/

/** Splits pasted text into Google file addresses and lines that are not addresses. */
export function parsePasted(text: string): { ok: string[]; bad: string[] } {
  const ok: string[] = []
  const bad: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = DOC_URL.exec(line)
    if (m) ok.push(m[2])
    else bad.push(line)
  }
  return { ok: [...new Set(ok)], bad }
}
