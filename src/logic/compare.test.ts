import { describe, expect, it } from 'vitest'
import { cmpCounts, normalise, plan, shownDoc, summary, warnings, TOOLS, type DocChoice } from './compare'
import { DOCS, REPOS } from './exampleData'
import { checkCounts, checkLines, checkSentence, checkedNote, checkedStatus, exportRows, outcomeFor, parsePasted, updateLines } from './run'
import { permDiff } from './compare'

const doc = (id: string) => DOCS.find((d) => d.id === id)!.files!
const main: DocChoice = { doc: 'main', t: {} }

describe('comparing a document with the repos', () => {
  it('counts differences against each repo', () => {
    expect(cmpCounts(doc('biol'), REPOS.main)).toEqual(['3 files differ', '2 missing'])
    expect(cmpCounts(doc('psyc'), REPOS.exp)).toEqual([])
  })

  it('updates only what differs, and adds missing tools', () => {
    const p = plan(doc('biol'), REPOS, main)
    const changed = p.filter((r) => r.res !== 'unchanged').map((r) => `${r.f}:${r.res}`)
    expect(changed).toEqual(['Code2.gs:updated', 'Code8.gs:updated', 'Sidebar8.html:updated', 'Code9.gs:added', 'Sidebar9.html:added'])
    expect(summary(doc('biol'), REPOS, main)).toBe('Will update: 3 tools from Main Repo · 1 not added')
  })

  it('never goes backwards by default: a newer copy in the document is kept', () => {
    const p = plan(doc('psyc'), REPOS, main)
    expect(p.find((r) => r.f === 'appsscript.json')!.res).toBe('unchanged')
  })

  it('keeps files that are not in GitHub unless told to remove them', () => {
    expect(plan(doc('hlth'), REPOS, main).find((r) => r.f === 'MyNotes.gs')!.res).toBe('unchanged')
    expect(plan(doc('hlth'), REPOS, { doc: 'main', t: { other: 'remove' } }).find((r) => r.f === 'MyNotes.gs')!.res).toBe('removed')
  })
})

describe('warnings', () => {
  it('flags a tool the chosen menu cannot open, and offers only fixes that work', () => {
    const w = warnings(doc('psyc'), REPOS, main)
    expect(w).toHaveLength(1)
    expect(w[0].fixes.map((f) => f.label)).toEqual(['Keep this document’s menu', 'Take the menu from the Experimental Repo'])
  })

  it('flags missing permissions when Create Video List is added on its own', () => {
    const w = warnings(doc('biol'), REPOS, { doc: 'main', t: { video: 'exp' } })
    expect(w.map((x) => x.id)).toEqual(['menu', 'perm'])
    // Keeping BIOL's own menu would not help: it has no Create Video List item either.
    expect(w[0].fixes.map((f) => f.label)).not.toContain('Keep this document’s menu')
  })
})

describe('the whole-document toggle', () => {
  it('shows Mixed once tools come from different repos', () => {
    expect(shownDoc(doc('biol'), REPOS, { doc: 'main', t: { video: 'exp' } })).toBe('mixed')
  })

  it('lights up again when every choice agrees with one repo', () => {
    const t = Object.fromEntries(TOOLS.filter((x) => x.k !== 'time' && x.k !== 'model').map((x) => [x.k, 'exp' as const]))
    expect(normalise(doc('biol'), REPOS, { doc: 'main', t }).doc).toBe('exp')
  })

  it('treats a tool that is identical in both repos as agreeing with either', () => {
    expect(shownDoc(doc('biol'), REPOS, { doc: 'main', t: { dir: 'exp' } })).toBe('main')
  })
})

describe('check and update reports', () => {
  const both = ['main', 'exp'] as const
  const list = [...DOCS]
  it('reports every document, and the counts agree everywhere', () => {
    const L = checkLines(list, REPOS, [...both])
    expect(L.some((l) => l.kind === 'error' && l.msg.includes('NURS 4100'))).toBe(true)
    const c = checkCounts(list, REPOS, [...both])
    expect(c.total).toBe(c.need + c.upToDate + c.cannot + c.skipped)
    expect(L[L.length - 1].msg).toBe(checkSentence(c))
  })
  it('measures "up to date" against the Main Repo, or the Experimental Repo when only it is compared', () => {
    const psyc = DOCS.find((d) => d.id === 'psyc')!
    expect(checkedStatus(psyc, REPOS, [...both])).toBe('out')
    expect(checkedNote(psyc, REPOS, [...both])).toContain('Matches the Experimental Repo exactly')
    expect(checkedStatus(psyc, REPOS, ['exp'])).toBe('ok')
  })
  it('skips a document with an unfixed warning and fails one without edit access', () => {
    expect(outcomeFor(DOCS.find((d) => d.id === 'psyc')!, REPOS).result).toBe('blocked')
    const nurs = outcomeFor(DOCS.find((d) => d.id === 'nurs')!, REPOS)
    expect(nurs.result).toBe('error')
    expect(nurs.message).toContain('Details for support:')
  })
  it('uses the Main Repo for a document nobody has chosen for yet', () => {
    expect(outcomeFor(DOCS.find((d) => d.id === 'biol')!, REPOS).result).toBe('done')
  })
  it('lists one line and one export row per file, under the document’s own account', () => {
    const biol = DOCS.find((d) => d.id === 'biol')!
    const psyc = { ...DOCS.find((d) => d.id === 'psyc')!, account: 'EX' as const, files: biol.files }
    const os = new Map([biol, psyc].map((d) => [d.id, outcomeFor(d, REPOS)]))
    const L = updateLines([biol], os, false)
    expect(L.filter((l) => l.ts === '' && /^[✓·]/.test(l.msg))).toHaveLength(os.get('biol')!.rows.length)
    const rows = exportRows([biol, psyc], os, false)
    expect(rows.filter((r) => r[1] === 'extrasnow75@gmail.com')).toHaveLength(os.get('psyc')!.rows.length)
  })
})

describe('pasted addresses', () => {
  it('keeps Google file addresses and lists the other lines', () => {
    const r = parsePasted('https://docs.google.com/document/d/1KKlxnDcBXZJ1vrNrVsb_k03CJM7sS8i_m-Bm7LDz4_A/edit\nhello world\n\nhttps://example.com/x')
    expect(r.ok).toEqual(['1KKlxnDcBXZJ1vrNrVsb_k03CJM7sS8i_m-Bm7LDz4_A'])
    expect(r.bad).toEqual(['hello world', 'https://example.com/x'])
  })
})

describe('permissions', () => {
  it('says in plain words what a repo would add', () => {
    expect(permDiff(DOCS.find((d) => d.id === 'biol')!.files!, REPOS)).toBe('Experimental Repo adds Google Sheets')
  })
})
