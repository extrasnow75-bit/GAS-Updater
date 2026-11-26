/**
 * What Check and Update report, as timeline lines and per-document results. TEST BUILD:
 * the work itself is simulated; the wording and colours follow the Rubric Creator app's
 * Analyze & Deploy timeline (green success, red failure, amber "what to do").
 */
import { SUPPORT_CONTACT, type DocStatus, type ExampleDoc } from './exampleData'
import { REPO_LONG, REPO_NAME, cmpCounts, finalFiles, plan, warnings, type DocChoice, type FileSet, type PlanRow, type Repos } from './compare'

export type LineKind = 'info' | 'success' | 'error' | 'warning'
export interface Line {
  ts: string
  msg: string
  kind: LineKind
}

export interface ListDoc extends ExampleDoc {
  checked: boolean
}

export const NO_EDIT_ACCESS = (name: string) =>
  `You can view ${name} but not edit it, so its script could not be changed. Ask the document’s owner for edit access, then try again. If it keeps happening, contact ${SUPPORT_CONTACT}. Details for support: Apps Script API 403 PERMISSION_DENIED: The caller does not have permission. (test build example)`

/** The status chip for a document once it has been checked. */
export function checkedStatus(d: ListDoc, repos: Repos): DocStatus {
  if (!d.files) return d.status
  const known = new Set([...Object.keys(repos.main), ...Object.keys(repos.exp)])
  if (Object.keys(d.files).some((f) => !known.has(f))) return 'extra'
  // Up to date means up to date with the Main Repo, which every document starts on.
  return cmpCounts(d.files, repos.main).length ? 'out' : 'ok'
}

/** A plain line saying what the status means. */
export function checkedNote(d: ListDoc, repos: Repos): string {
  if (!d.files) return d.note
  const main = cmpCounts(d.files, repos.main).length === 0
  const exp = cmpCounts(d.files, repos.exp).length === 0
  if (main) return 'Matches the Main Repo exactly'
  if (exp) return 'Matches the Experimental Repo exactly, but is behind the Main Repo'
  return d.note
}

/** "2026-11-25 14:14" in the computer's own time zone. */
const localStamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export function checkLines(docs: ListDoc[], repos: Repos, now = new Date()): Line[] {
  const ts = clock(now)
  const L: Line[] = [{ ts, msg: `Checking ${docs.length} document${docs.length === 1 ? '' : 's'} against the Main Repo and the Experimental Repo…`, kind: 'info' }]
  let need = 0
  let bad = 0
  for (const d of docs) {
    if (d.type === 'Quiz') L.push({ ts, msg: `"${d.name}" skipped: there is no Quiz Repo yet`, kind: 'warning' })
    else if (d.status === 'perm') {
      bad++
      L.push({ ts, msg: `✗ "${d.name}" could not be checked: you can view this document but not edit it`, kind: 'error' })
      L.push({ ts, msg: '   Ask the document’s owner for edit access, then run Check again.', kind: 'warning' })
    } else if (d.status === 'none') {
      bad++
      L.push({ ts, msg: `✗ "${d.name}" could not be checked: its script was not found`, kind: 'error' })
      L.push({ ts, msg: '   Open the document once so its script can be found, or paste its script ID.', kind: 'warning' })
    } else if (d.files) {
      const st = checkedStatus(d, repos)
      if (st === 'ok') L.push({ ts, msg: `✓ "${d.name}" matches the Main Repo exactly`, kind: 'success' })
      else {
        need++
        const behind = (['main', 'exp'] as const).filter((r) => cmpCounts(d.files!, repos[r]).length).map((r) => REPO_NAME[r])
        const matchesExp = !cmpCounts(d.files, repos.exp).length
        L.push({ ts, msg: `"${d.name}" is out of date with the ${behind.join(' and the ')}${matchesExp ? ' (it matches the Experimental Repo exactly)' : ''}`, kind: 'warning' })
      }
    }
  }
  const checked = docs.filter((d) => d.type !== 'Quiz').length - bad
  L.push({ ts, msg: `${checked} document${checked === 1 ? '' : 's'} checked. ${need} need${need === 1 ? 's' : ''} updating.`, kind: 'success' })
  if (bad) L.push({ ts, msg: `${bad} document${bad === 1 ? '' : 's'} could not be checked.`, kind: 'warning' })
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

export function outcomeFor(d: ListDoc, repos: Repos, choice: DocChoice | undefined): UpdateOutcome {
  if (d.type === 'Quiz') return { id: d.id, result: 'skipped', message: 'Skipped: there is no Quiz Repo yet.', rows: [] }
  if (d.status === 'perm') return { id: d.id, result: 'error', message: NO_EDIT_ACCESS(d.name), rows: [] }
  if (d.status === 'none' || !d.files || !choice) return { id: d.id, result: 'skipped', message: 'Skipped: its script was not found.', rows: [] }
  const W = warnings(d.files, repos, choice)
  if (W.length) return { id: d.id, result: 'blocked', message: W[0].msg, rows: [] }
  const rows = plan(d.files, repos, choice)
  if (!rows.some((r) => r.res !== 'unchanged')) return { id: d.id, result: 'nochange', rows }
  return { id: d.id, result: 'done', rows, after: finalFiles(d.files, repos, choice) }
}

export function updateLines(docs: ListDoc[], outcomes: UpdateOutcome[], practice: boolean, now = new Date()): Line[] {
  const ts = clock(now)
  const stamp = localStamp(now).replace(':', '.')
  const L: Line[] = [{ ts, msg: `${practice ? 'Practice run: nothing will be changed. ' : ''}Updating ${docs.length} document${docs.length === 1 ? '' : 's'}, using the choices from Check…`, kind: 'info' }]
  let changed = 0
  let total = 0
  let ok = 0
  let failed = 0
  for (const d of docs) {
    const o = outcomes.find((x) => x.id === d.id)!
    if (o.result === 'skipped') { L.push({ ts, msg: `"${d.name}" ${o.message!.charAt(0).toLowerCase()}${o.message!.slice(1)}`, kind: 'warning' }); continue }
    if (o.result === 'blocked') { L.push({ ts, msg: `"${d.name}" skipped: ${o.message}`, kind: 'warning' }); continue }
    if (o.result === 'nochange') { L.push({ ts, msg: `"${d.name}" skipped: nothing to update with the choices made`, kind: 'info' }); continue }
    if (o.result === 'error') {
      failed++
      L.push({ ts, msg: `Updating "${d.name}"…`, kind: 'info' })
      L.push({ ts, msg: `✗ "${d.name}" failed: you can view this document but not edit it. No files were changed.`, kind: 'error' })
      L.push({ ts, msg: '   Ask the document’s owner for edit access, then try again.', kind: 'warning' })
      continue
    }
    ok++
    L.push({ ts, msg: `Updating "${d.name}"…`, kind: 'info' })
    L.push({ ts, msg: `   Backup ${practice ? 'would be ' : ''}saved: "${d.name} script backup ${stamp}"`, kind: 'info' })
    let n = 0
    for (const r of o.rows) {
      const ch = r.res !== 'unchanged'
      if (ch) n++
      total++
      const from = ch && r.res !== 'removed' && (r.src === 'main' || r.src === 'exp') ? `from ${REPO_NAME[r.src]}` : ''
      L.push({
        ts,
        msg: `   ${ch ? '✓' : '·'} ${r.f.padEnd(16)} ${(practice && ch ? 'would be ' + r.res : r.res).padEnd(practice ? 18 : 9)} ${from.padEnd(22)} ${r.stamp ? 'last updated ' + r.stamp : '(no date stamp)'}`,
        kind: ch ? 'success' : 'info',
      })
    }
    changed += n
    L.push({
      ts,
      msg: practice
        ? `✓ "${d.name}" practice run finished: ${n} file${n === 1 ? '' : 's'} would change, ${o.rows.length - n} unchanged`
        : `✓ "${d.name}" updated successfully: ${n} file${n === 1 ? '' : 's'} changed, ${o.rows.length - n} unchanged, checked against GitHub`,
      kind: 'success',
    })
  }
  L.push({
    ts,
    msg: practice
      ? `Practice run: ${ok} document${ok === 1 ? '' : 's'} would be updated (${total} files: ${changed} would change, ${total - changed} unchanged). Untick Practice run to update for real.`
      : `${ok} document${ok === 1 ? '' : 's'} successfully updated (${total} files: ${changed} changed, ${total - changed} unchanged).`,
    kind: 'success',
  })
  if (failed) L.push({ ts, msg: `${failed} document${failed === 1 ? '' : 's'} could not be updated.`, kind: 'warning' })
  return L
}

export const EXPORT_HEADERS = ['Uploaded', 'Google account', 'Blueprint', 'Address', 'Repo', 'File', 'File’s “Last updated”', 'Result', 'Backup']

export function exportRows(docs: ListDoc[], outcomes: UpdateOutcome[], account: string, practice: boolean, now = new Date()): string[][] {
  const when = localStamp(now)
  const rows: string[][] = []
  for (const d of docs) {
    const o = outcomes.find((x) => x.id === d.id)!
    if (o.result === 'done')
      for (const r of o.rows)
        rows.push([when, account, d.name, d.url, REPO_LONG[r.src], r.f, r.stamp || '(none)', practice && r.res !== 'unchanged' ? `Would be ${r.res}` : r.res[0].toUpperCase() + r.res.slice(1), practice ? '(practice run)' : 'Backup link'])
    else if (o.result === 'error') rows.push([when, account, d.name, d.url, '', '', '', 'Failed: no edit access', ''])
  }
  return rows
}
