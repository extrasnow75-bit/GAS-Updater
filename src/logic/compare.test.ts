import { describe, expect, it } from 'vitest'
import { cmpCounts, normalise, plan, shownDoc, summary, warnings, TOOLS, type DocChoice } from './compare'
import { DOCS, REPOS } from './exampleData'

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

import { checkLines, exportRows, outcomeFor, updateLines, type ListDoc } from './run'

describe('check and update reports', () => {
  const list = DOCS.map((d) => ({ ...d, checked: true })) as ListDoc[]
  it('reports every document in plain words', () => {
    const L = checkLines(list, REPOS)
    expect(L.some((l) => l.kind === 'error' && l.msg.includes('NURS 4100'))).toBe(true)
    expect(L.some((l) => l.msg.includes('BIOL 1010 Module 3 Quiz') && l.msg.includes('no Quiz Repo'))).toBe(true)
  })
  it('skips a document with an unfixed warning and fails one without edit access', () => {
    const psyc = outcomeFor(list.find((d) => d.id === 'psyc')!, REPOS, { doc: 'main', t: {} })
    expect(psyc.result).toBe('blocked')
    const nurs = outcomeFor(list.find((d) => d.id === 'nurs')!, REPOS, undefined)
    expect(nurs.result).toBe('error')
    expect(nurs.message).toContain('Details for support:')
  })
  it('lists one line and one export row per file for an updated blueprint', () => {
    const biol = list.find((d) => d.id === 'biol')!
    const o = outcomeFor(biol, REPOS, { doc: 'main', t: {} })
    const L = updateLines([biol], [o], false)
    expect(L.filter((l) => l.msg.includes('last updated') || l.msg.includes('no date stamp'))).toHaveLength(o.rows.length)
    expect(exportRows([biol], [o], 'x@y', false)).toHaveLength(o.rows.length)
  })
})
