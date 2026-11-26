/**
 * How a document's script compares with the Main Repo and the Experimental Repo, and what
 * an update would do with the choices the person has made.
 *
 * Pure functions only: no Google, GitHub or React here, so they can be tested directly.
 * Files are compared by content (`v`, which stands in for a content hash). The "Last
 * updated" date stamp (`s`) is only shown to people and used to tell which side is newer.
 */

export type RepoKey = 'main' | 'exp'
/** Every repo the app compares with, in display order. Add the Quiz Repo here later. */
export const REPO_KEYS: readonly RepoKey[] = ['main', 'exp']
export type Choice = RepoKey | 'keep' | 'remove'

/**
 * One script file: its date stamp (may be empty) and a stand-in for its content. In the real
 * app `v` becomes a hash of the file, and the facts the warnings need are read from the file
 * when it is fetched: `menu` (tool keys the Blueprint Tools menu in Code.gs lists) and
 * `scopes` (plain-language permissions in appsscript.json).
 */
export interface FileVersion {
  s: string
  v: string
  menu?: string[]
  scopes?: string[]
}
export type FileSet = Record<string, FileVersion>

export interface Tool {
  k: string
  n: string
  sub?: string
  f: string[]
  other?: boolean
}

export const REPO_NAME: Record<RepoKey, string> = { main: 'Main Repo', exp: 'Experimental Repo' }
export const REPO_LONG: Record<Choice, string> = {
  main: 'Main Repo (blueprint-tools-script)',
  exp: 'Experimental Repo (blueprint-tools-script-private)',
  keep: 'Kept (not changed)',
  remove: 'Removed',
}

/** Each tool's .gs and .html move together. Permissions (appsscript.json) is its own row. */
export const TOOLS: Tool[] = [
  { k: 'menu', n: 'Add Activity Titles, Tools, Due Date Headers, & Times', sub: 'Also builds the Blueprint Tools menu', f: ['Code.gs', 'Sidebar.html'] },
  { k: 'dir', n: 'Deploy Activity Directions', f: ['Code2.gs', 'Sidebar2.html'] },
  { k: 'time', n: 'Time Estimator', f: ['Code3.gs', 'Sidebar3.html'] },
  { k: 'model', n: 'Create Model Module', f: ['Code5.gs', 'Sidebar5.html'] },
  { k: 'dates', n: 'Specialty Tool: Add Module Dates &/or Holiday Modules', f: ['Code8.gs', 'Sidebar8.html'] },
  { k: 'map', n: 'Design Map → Dev Tab', f: ['Code9.gs', 'Sidebar9.html'] },
  { k: 'video', n: 'Create Video List', sub: 'Experimental only, for now', f: ['Code10.gs', 'Sidebar10.html'] },
  { k: 'perm', n: 'Permissions', sub: 'appsscript.json: what the tools are allowed to do', f: ['appsscript.json'] },
]

export type Repos = Record<RepoKey, FileSet>

/** What the person has chosen for one document: a whole-document repo plus per-tool changes. */
export interface DocChoice {
  doc: RepoKey
  t: Record<string, Choice>
}

export type CellState = 'same' | 'differ' | 'missing' | 'extra' | 'na'

export function cmpState(doc: FileSet, src: FileSet, f: string): CellState {
  const d = doc[f]
  const g = src[f]
  if (!d && !g) return 'na'
  if (d && g) return d.v === g.v ? 'same' : 'differ'
  return d ? 'extra' : 'missing'
}

export const has = (files: FileSet, t: Tool): boolean => t.f.some((f) => !!files[f])

/** The tools for this document, plus a group for any files that are not in GitHub at all. */
export function toolsFor(doc: FileSet): Tool[] {
  const known = new Set(TOOLS.flatMap((t) => t.f))
  const other = Object.keys(doc).filter((f) => !known.has(f))
  return other.length
    ? [...TOOLS, { k: 'other', n: 'Files not in GitHub', sub: 'Someone may have added these by hand', f: other, other: true }]
    : TOOLS
}

/**
 * Where a tool starts when the whole document is set to `repo`. Safe by default: if the
 * repo lacks the tool, or the document's copy is newer, the tool is kept as it is.
 */
export function defaultChoice(doc: FileSet, repos: Repos, repo: RepoKey, t: Tool): Choice {
  const src = repos[repo]
  if (t.other) return 'keep'
  if (!has(src, t)) return 'keep'
  if (t.f.every((f) => cmpState(doc, src, f) === 'same')) return repo
  if (t.f.some((f) => doc[f] && src[f] && doc[f].v !== src[f].v && doc[f].s > src[f].s)) return 'keep'
  return repo
}

/** Every document starts on the Main Repo until the person chooses otherwise. */
export const DEFAULT_CHOICE: DocChoice = { doc: 'main', t: {} }

export const choiceFor = (doc: FileSet, repos: Repos, c: DocChoice, t: Tool): Choice =>
  c.t[t.k] ?? defaultChoice(doc, repos, c.doc, t)

/** The files the document would end up with. */
export function finalFiles(doc: FileSet, repos: Repos, c: DocChoice): FileSet {
  const out: FileSet = {}
  for (const t of toolsFor(doc)) {
    const ch = choiceFor(doc, repos, c, t)
    for (const f of t.f) {
      const v = ch === 'keep' ? doc[f] : ch === 'remove' ? undefined : repos[ch][f]
      if (v) out[f] = v
    }
  }
  return out
}

export type FileResult = 'updated' | 'added' | 'removed' | 'unchanged'
export interface PlanRow {
  f: string
  t: Tool
  res: FileResult
  src: Choice
  stamp: string
}

/** One entry per file: what an update would do to it. */
export function plan(doc: FileSet, repos: Repos, c: DocChoice): PlanRow[] {
  const fin = finalFiles(doc, repos, c)
  const rows: PlanRow[] = []
  for (const t of toolsFor(doc)) {
    const ch = choiceFor(doc, repos, c, t)
    for (const f of t.f) {
      const d = doc[f]
      const n = fin[f]
      if (!d && !n) continue
      const res: FileResult = !n ? 'removed' : !d ? 'added' : d.v === n.v ? 'unchanged' : 'updated'
      rows.push({ f, t, res, src: ch, stamp: (n || d).s })
    }
  }
  return rows
}

export interface Fix {
  k: string
  c: Choice
  label: string
}
export interface Warning {
  id: string
  msg: string
  fixes: Fix[]
}

const VIDEO = TOOLS.find((t) => t.k === 'video')!

/** Choices that would leave a tool broken. Known dependencies, to be confirmed from the code. */
function warnCore(doc: FileSet, repos: Repos, c: DocChoice): Warning[] {
  const fin = finalFiles(doc, repos, c)
  const W: Warning[] = []
  const video = !!fin['Code10.gs']
  const menuHasVideo = !!fin['Code.gs']?.menu?.includes('video')
  const sheets = !!fin['appsscript.json']?.scopes?.includes('Google Sheets')
  const dropVideo: Fix[] = has(doc, VIDEO) ? [] : [{ k: 'video', c: 'keep', label: 'Don’t add Create Video List' }]
  if (video && !menuHasVideo)
    W.push({
      id: 'menu',
      msg: 'The Blueprint Tools menu you chose (Code.gs) has no “Create Video List” item, so nobody could open that tool.',
      fixes: [
        { k: 'menu', c: 'keep', label: 'Keep this document’s menu' },
        { k: 'menu', c: 'exp', label: 'Take the menu from the Experimental Repo' },
        ...dropVideo,
      ],
    })
  if (video && !sheets)
    W.push({
      id: 'perm',
      msg: '“Create Video List” needs Google Sheets access, and the Permissions you chose (appsscript.json) do not include it.',
      fixes: [{ k: 'perm', c: 'exp', label: 'Take Permissions from the Experimental Repo' }, ...dropVideo],
    })
  if (!video && menuHasVideo)
    W.push({
      id: 'novideo',
      msg: 'The menu you chose lists “Create Video List”, but the tool itself would not be in this document.',
      fixes: [
        { k: 'video', c: 'exp', label: 'Add Create Video List from the Experimental Repo' },
        { k: 'menu', c: 'main', label: 'Take the menu from the Main Repo' },
      ],
    })
  return W
}

/** Warnings, offering only the fixes that actually clear each problem. */
export function warnings(doc: FileSet, repos: Repos, c: DocChoice): Warning[] {
  return warnCore(doc, repos, c).map((w) => ({
    ...w,
    fixes: w.fixes.filter((fx) => {
      const t = TOOLS.find((x) => x.k === fx.k)!
      if (choiceFor(doc, repos, c, t) === fx.c) return false
      const tried: DocChoice = { doc: c.doc, t: { ...c.t, [fx.k]: fx.c } }
      return !warnCore(doc, repos, tried).some((x) => x.id === w.id)
    }),
  }))
}

/**
 * Which whole-document button should be lit: the repo that every tool choice agrees with
 * (counting tools that are identical in both repos, and safe "keep" defaults), else 'mixed'.
 */
export function shownDoc(doc: FileSet, repos: Repos, c: DocChoice): RepoKey | 'mixed' {
  const fin = (t: Tool, ch: Choice) =>
    t.f
      .map((f) => {
        const v = ch === 'keep' ? doc[f] : ch === 'remove' ? undefined : repos[ch][f]
        return v ? v.v : '-'
      })
      .join()
  const tools = toolsFor(doc)
  const cur = Object.fromEntries(tools.map((t) => [t.k, choiceFor(doc, repos, c, t)]))
  const order: RepoKey[] = [c.doc, ...REPO_KEYS.filter((k) => k !== c.doc)]
  for (const s of order) {
    const ok = tools.every((t) =>
      [s, defaultChoice(doc, repos, s, t)].some((ch) => fin(t, ch as Choice) === fin(t, cur[t.k])),
    )
    if (ok) return s
  }
  return 'mixed'
}

/** After a per-tool change, light the whole-document button again if the choices agree. */
export function normalise(doc: FileSet, repos: Repos, c: DocChoice): DocChoice {
  const s = shownDoc(doc, repos, c)
  return s === 'mixed' ? c : { ...c, doc: s }
}

/** "Will update: 3 tools from Main Repo · 1 not added" */
export function summary(doc: FileSet, repos: Repos, c: DocChoice): string {
  const by: Record<RepoKey, string[]> = { main: [], exp: [] }
  let kept = 0
  let removed = 0
  let notAdded = 0
  const p = plan(doc, repos, c)
  for (const t of toolsFor(doc)) {
    const ch = choiceFor(doc, repos, c, t)
    const rows = p.filter((r) => r.t === t)
    if (rows.some((r) => r.res === 'removed')) removed++
    else if (rows.some((r) => r.res !== 'unchanged') && (ch === 'main' || ch === 'exp')) by[ch].push(t.n)
    else if (ch === 'keep' && !has(doc, t)) notAdded++
    else if (ch === 'keep' && REPO_KEYS.some((s) => has(repos[s], t) && t.f.some((f) => cmpState(doc, repos[s], f) !== 'same')))
      kept++
  }
  const parts: string[] = []
  for (const s of REPO_KEYS)
    if (by[s].length) parts.push(`${by[s].length} tool${by[s].length === 1 ? '' : 's'} from ${REPO_NAME[s]}`)
  if (kept) parts.push(`${kept} kept as ${kept === 1 ? 'it is' : 'they are'}`)
  if (removed) parts.push(`${removed} removed`)
  if (notAdded) parts.push(`${notAdded} not added`)
  return by.main.length || by.exp.length || removed ? 'Will update: ' + parts.join(' · ') : 'Nothing to update with these choices'
}

/** "3 files differ, 2 missing" for one repo. Empty when the document matches it exactly. */
export function cmpCounts(doc: FileSet, src: FileSet): string[] {
  const c = { differ: 0, missing: 0, extra: 0 }
  for (const f of new Set([...Object.keys(doc), ...Object.keys(src)])) {
    const k = cmpState(doc, src, f)
    if (k === 'differ' || k === 'missing' || k === 'extra') c[k]++
  }
  const parts: string[] = []
  if (c.differ) parts.push(`${c.differ} file${c.differ === 1 ? '' : 's'} differ${c.differ === 1 ? 's' : ''}`)
  if (c.missing) parts.push(`${c.missing} missing`)
  if (c.extra) parts.push(`${c.extra} extra`)
  return parts
}

/** True when any repo differs from the document for this tool, or the tool is missing. */
export function toolDiffers(doc: FileSet, repos: Repos, t: Tool): boolean {
  const allSame = t.f.every((f) => REPO_KEYS.every((s) => ['same', 'na'].includes(cmpState(doc, repos[s], f))))
  const missing = !t.f.some((f) => doc[f]) && t.f.some((f) => repos.main[f] || repos.exp[f])
  return !allSame || missing
}

/** "Experimental Repo adds Google Sheets" */
export function permDiff(doc: FileSet, repos: Repos): string {
  const d = doc['appsscript.json']
  const out: string[] = []
  for (const s of REPO_KEYS) {
    const g = repos[s]['appsscript.json']
    if (!d || !g || d.v === g.v) continue
    const have = d.scopes ?? []
    const want = g.scopes ?? []
    const add = want.filter((x) => !have.includes(x))
    const rem = have.filter((x) => !want.includes(x))
    const bits = [add.length ? 'adds ' + add.join(', ') : '', rem.length ? 'removes ' + rem.join(', ') : ''].filter(Boolean)
    out.push(`${REPO_NAME[s]} ${bits.length ? bits.join(' and ') : 'has different settings'}`)
  }
  return out.join(' · ')
}

/** Dates without the time zone, for the narrow table. All stamps are Mountain Time. */
export const shortStamp = (st: string): string => (st ? st.replace(/ M[DS]T$/, '') : st)

/**
 * Tools that are kept as they are although some repo has a different version: the ones the
 * person (or a safe default) chose to leave alone.
 */
export function keptTools(doc: FileSet, repos: Repos, c: DocChoice): Tool[] {
  return toolsFor(doc).filter(
    (t) =>
      choiceFor(doc, repos, c, t) === 'keep' &&
      has(doc, t) &&
      t.f.some((f) => REPO_KEYS.some((s) => ['differ', 'extra'].includes(cmpState(doc, repos[s], f)))),
  )
}

/** Everything the documents list shows for one document, worked out once per change. */
export interface Analysis {
  tools: Tool[]
  lit: RepoKey | 'mixed'
  warnings: Warning[]
  summary: string
  differing: Tool[]
  counts: Record<RepoKey, string[]>
  permDiff: string
  choices: Record<string, Choice>
}

export function analyse(doc: FileSet, repos: Repos, c: DocChoice): Analysis {
  const tools = toolsFor(doc)
  return {
    tools,
    lit: shownDoc(doc, repos, c),
    warnings: warnings(doc, repos, c),
    summary: summary(doc, repos, c),
    differing: tools.filter((t) => toolDiffers(doc, repos, t)),
    counts: Object.fromEntries(REPO_KEYS.map((r) => [r, cmpCounts(doc, repos[r])])) as Record<RepoKey, string[]>,
    permDiff: permDiff(doc, repos),
    choices: Object.fromEntries(tools.map((t) => [t.k, choiceFor(doc, repos, c, t)])),
  }
}
