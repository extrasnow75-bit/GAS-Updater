import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HelpCircle, AlertCircle, ChevronDown, FileText, Folder, Plus, FlaskConical, X, Check, Loader2 } from 'lucide-react'
import { ZoomControl } from './components/ZoomControl'
import { ErrorText, ErrorDetails } from './components/ErrorText'
import { SetupPanel, setupRemaining, type SetupField, type SetupState, FIELD_INFO } from './components/SetupPanel'
import { DrivePicker, type PickerRequest } from './components/DrivePicker'
import { ToolTable } from './components/ToolTable'
import { RunPanel, type RunSummary } from './components/RunPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Modal } from './components/Modal'
import { AccountBadge, ActionButton, FOCUS_RING, OpenLink, PILL, Pill } from './components/ui'
import { ACCOUNTS, BACKUP_URL, DOCS, REPOS } from './logic/exampleData'
import { DEFAULT_CHOICE, REPO_KEYS, REPO_NAME, type DocChoice, type FileSet, type RepoKey } from './logic/compare'
import {
  checkCounts,
  checkLines,
  checkSentence,
  checkedNote,
  checkedStatus,
  exportRows,
  outcomeFor,
  parsePasted,
  updateLines,
  type Line,
  type ListDoc,
  type UpdateOutcome,
} from './logic/run'

const isMac = window.api?.app?.platform === 'darwin'
const TICK_MS = 110

const START_SETUP: SetupState = {
  account: 'GS',
  signedIn: { GS: true, EX: true },
  token: '',
  semesterList: 'Multi-Semester List · tab “Projects”',
  backupFolder: '',
  history: '',
  blueprintTemplate: 'Copy of Template Blueprint 6.0 for GAS Test (Nov 2026)',
  quizTemplate: 'Template Quiz',
}

/** Titles for the Drive picker when it is choosing one file for Initial setup. */
const PICK_TITLE: Record<SetupField, string> = {
  semesterList: 'Choose the multi-semester list',
  backupFolder: 'Choose the backup folder',
  history: 'Choose the update history sheet',
  blueprintTemplate: 'Choose the blueprint template',
  quizTemplate: 'Choose the quiz questions template',
}

type Mode = 'none' | 'check' | 'update'
interface CheckRun { ids: string[]; compared: RepoKey[] }
interface UpdateRun { ids: string[]; outcomes: Map<string, UpdateOutcome>; practice: boolean; when: Date }

/** The account button in the ribbon: a simple disclosure (not an application menu). */
function AccountMenu({ setup, onSwitch }: { setup: SetupState; onSwitch(k: 'GS' | 'EX'): void }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    wrap.current?.querySelector<HTMLElement>('[data-first]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])
  if (!setup.signedIn[setup.account]) return null
  const a = ACCOUNTS[setup.account]
  const others = (['GS', 'EX'] as const).filter((k) => k !== setup.account && setup.signedIn[k])
  return (
    <div className="relative" ref={wrap}>
      <button ref={button} type="button" aria-expanded={open} aria-controls="account-switch" onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 text-xs font-bold text-gray-700 border border-gray-500 rounded-lg pl-1 pr-2 py-1 hover:bg-gray-50 ${FOCUS_RING}`}>
        <AccountBadge who={setup.account} size="md" />
        <span>{a.email}</span>
        <span className="sr-only">: switch Google account</span>
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div id="account-switch" className="absolute right-0 mt-1 z-30 w-64 bg-white border border-gray-300 rounded-xl shadow-lg p-1 text-[13px]">
          {others.length ? (
            others.map((k, i) => (
              <button key={k} data-first={i === 0 ? '' : undefined} type="button" onClick={() => { onSwitch(k); setOpen(false); button.current?.focus() }} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 text-left ${FOCUS_RING}`}>
                <AccountBadge who={k} size="md" />
                Use {ACCOUNTS[k].email}
              </button>
            ))
          ) : (
            <p data-first="" tabIndex={-1} className="px-2.5 py-2 text-gray-700 focus:outline-none">Sign in to a second account in Initial setup to switch here.</p>
          )}
        </div>
      )}
    </div>
  )
}

const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `Elapsed: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

export default function App() {
  const [setup, setSetup] = useState<SetupState>(START_SETUP)
  const [picker, setPicker] = useState<(PickerRequest & { field?: SetupField }) | null>(null)
  const [docs, setDocs] = useState<ListDoc[]>([])
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [choices, setChoices] = useState<Record<string, DocChoice>>({})
  const [practice, setPractice] = useState(true)
  const [compared, setCompared] = useState<Set<RepoKey>>(new Set(REPO_KEYS))
  const [mode, setMode] = useState<Mode>('none')
  const [lines, setLines] = useState<Line[]>([])
  const [shown, setShown] = useState(0)
  const [runKey, setRunKey] = useState(0)
  const [started, setStarted] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [checkRun, setCheckRun] = useState<CheckRun | null>(null)
  const [updateRun, setUpdateRun] = useState<UpdateRun | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [addNote, setAddNote] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [openTables, setOpenTables] = useState<Set<string>>(new Set())
  const pendingFiles = useRef<Record<string, FileSet>>({})

  const setupDone = setupRemaining(setup).length === 0
  const running = mode !== 'none' && shown < lines.length
  const comparedList = useMemo(() => REPO_KEYS.filter((r) => compared.has(r)), [compared])
  const choiceOf = useCallback((id: string) => choices[id] ?? DEFAULT_CHOICE, [choices])

  /** Says something to screen-reader users through the one always-present status area. */
  const announce = useCallback((text: string) => {
    setAnnouncement('')
    requestAnimationFrame(() => setAnnouncement(text))
  }, [])

  const wasDone = useRef(setupDone)
  useEffect(() => {
    if (setupDone && !wasDone.current) announce('Initial setup complete. The documents list is below the setup panel.')
    wasDone.current = setupDone
  }, [setupDone, announce])

  // Reveal timeline lines one at a time, so a run looks like a run.
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => {
      setShown((n) => n + 1)
      setNow(Date.now())
    }, TICK_MS)
    return () => clearTimeout(t)
  }, [running, shown])

  // When a real update finishes, the example documents take on their new scripts.
  useEffect(() => {
    if (mode === 'update' && !running && Object.keys(pendingFiles.current).length) {
      const next = pendingFiles.current
      pendingFiles.current = {}
      setDocs((ds) => ds.map((d) => (next[d.id] ? { ...d, files: next[d.id], checked: false } : d)))
    }
  }, [mode, running])

  const addDocs = (ids: string[]) => {
    const have = new Set(docs.map((d) => d.id))
    const fresh: ListDoc[] = DOCS.filter((d) => ids.includes(d.id) && !have.has(d.id)).map((d) => ({ ...d, account: setup.account, checked: false }))
    setAddNote(fresh.length ? `${plural(fresh.length, 'document')} added to the list.` : 'Those documents are already in the list.')
    setTicked((t) => new Set([...t, ...fresh.map((d) => d.id)]))
    setDocs([...docs, ...fresh])
  }

  const tickedDocs = docs.filter((d) => ticked.has(d.id))
  const docsById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs])

  const resetRun = () => {
    pendingFiles.current = {}
    setLines([])
    setShown(0)
    setMode('none')
  }

  const runCheck = () => {
    const ds = tickedDocs
    setDocs((cur) => cur.map((d) => (ticked.has(d.id) ? { ...d, checked: true } : d)))
    const run: CheckRun = { ids: ds.map((d) => d.id), compared: comparedList }
    setCheckRun(run)
    setUpdateRun(null)
    setLines(checkLines(ds, REPOS, comparedList))
    setShown(1)
    setStarted(Date.now())
    setRunKey((k) => k + 1)
    setMode('check')
    // Tick the ones that need updating.
    setTicked(new Set(ds.filter((d) => checkedStatus(d, REPOS, comparedList) === 'out').map((d) => d.id)))
  }

  const pendingOutcomes = useMemo(
    () => (confirming ? new Map(tickedDocs.map((d) => [d.id, outcomeFor(d, REPOS, choiceOf(d.id))])) : new Map<string, UpdateOutcome>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirming, ticked, docs, choices],
  )

  const startUpdate = () => {
    const ds = tickedDocs
    const os = new Map(ds.map((d) => [d.id, outcomeFor(d, REPOS, choiceOf(d.id))]))
    const when = new Date()
    setConfirming(false)
    setLines(updateLines(ds, os, practice, when))
    setShown(1)
    setStarted(Date.now())
    setRunKey((k) => k + 1)
    setMode('update')
    setUpdateRun({ ids: ds.map((d) => d.id), outcomes: os, practice, when })
    pendingFiles.current = {}
    if (!practice) for (const o of os.values()) if (o.after) pendingFiles.current[o.id] = o.after
  }

  const goToDoc = (id: string) => {
    setConfirming(false)
    setOpenTables((s) => new Set(s).add(id))
    // After the dialog has closed and returned focus, move it to the document's choices.
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-doc-table="${id}"]`)
      el?.scrollIntoView({ block: 'center' })
      el?.querySelector<HTMLElement>('input:checked, input, button')?.focus()
    }, 80)
  }

  const done = mode !== 'none' && shown >= lines.length
  const checkDocs = useMemo(() => (checkRun ? checkRun.ids.map((id) => docsById.get(id)).filter((d): d is ListDoc => !!d) : []), [checkRun, docsById])
  const counts = useMemo(() => (checkRun ? checkCounts(checkDocs, REPOS, checkRun.compared) : null), [checkRun, checkDocs])
  const updateDocs = useMemo(() => (updateRun ? updateRun.ids.map((id) => DOCS.find((d) => d.id === id)!).map((d) => ({ ...d, account: docsById.get(d.id)?.account ?? d.account })) : []), [updateRun, docsById])
  const rowsForExport = useMemo(() => (updateRun ? exportRows(updateDocs, updateRun.outcomes, updateRun.practice, updateRun.when) : []), [updateRun, updateDocs])

  // Announce the result once a run finishes.
  const lastDone = useRef(false)
  useEffect(() => {
    if (done && !lastDone.current) {
      if (mode === 'check' && counts) announce(`Check finished. ${checkSentence(counts)}`)
      if (mode === 'update' && updateRun) {
        const ok = [...updateRun.outcomes.values()].filter((o) => o.result === 'done').length
        announce(updateRun.practice ? `Practice run finished: ${plural(ok, 'document')} would be updated. Nothing was changed.` : `Update finished: ${plural(ok, 'document')} updated.`)
      }
    }
    lastDone.current = done
  }, [done, mode, counts, updateRun, announce])

  const summary: RunSummary | null = (() => {
    if (mode === 'none') return null
    const progress = lines.length ? Math.min(1, shown / lines.length) : 1
    const elapsed = fmtElapsed((done ? started + lines.length * TICK_MS : now) - started)
    if (mode === 'check' && counts) {
      const wrong = [
        ...(counts.cannotNames.perm.length ? [{ cause: 'You can view this document but not edit it.', fix: 'Ask the document’s owner for edit access, then run Check again.', docs: counts.cannotNames.perm }] : []),
        ...(counts.cannotNames.none.length ? [{ cause: 'The document’s script could not be found.', fix: 'Open the document once so its script can be found, or paste its script ID.', docs: counts.cannotNames.none }] : []),
      ]
      return {
        headline: !done ? 'Checking…' : counts.need ? `${plural(counts.need, 'document')} need${counts.need === 1 ? 's' : ''} updating` : 'Every checked document is up to date',
        tone: counts.need || counts.cannot ? 'attention' : 'good',
        bad: done && counts.cannot ? `${counts.cannot} could not be checked` : undefined,
        done,
        progress,
        elapsed,
        wrong,
      }
    }
    if (mode === 'update' && updateRun) {
      const os = [...updateRun.outcomes.values()]
      const ok = os.filter((o) => o.result === 'done').length
      const failed = os.filter((o) => o.result === 'error')
      const blocked = os.filter((o) => o.result === 'blocked')
      const nameOf = (id: string) => docsById.get(id)?.name ?? id
      return {
        headline: !done
          ? updateRun.practice ? 'Practice run…' : 'Updating…'
          : updateRun.practice
            ? `Practice run: ${plural(ok, 'document')} would be updated`
            : `${plural(ok, 'document')} updated successfully`,
        tone: failed.length || blocked.length ? 'attention' : 'good',
        bad: done && failed.length ? `${failed.length} failed` : undefined,
        done,
        progress,
        elapsed,
        wrong: [
          ...(failed.length ? [{ cause: 'You can view this document but not edit it.', fix: 'Ask the document’s owner for edit access, then try again.', docs: failed.map((o) => nameOf(o.id)) }] : []),
          ...(blocked.length ? [{ cause: 'A choice is needed first.', fix: 'Open “Tools and files” for the document and pick one of the fixes in the amber box, then update again.', docs: blocked.map((o) => nameOf(o.id)) }] : []),
        ],
        exportRows: rowsForExport,
        practice: updateRun.practice,
        onUpdateForReal: updateRun.practice
          ? () => {
              setPractice(false)
              setTicked(new Set(updateRun.ids))
              setConfirming(true)
            }
          : undefined,
      }
    }
    return null
  })()

  const statusLine = (() => {
    if (!docs.length) return null
    if (mode === 'update' && done && updateRun) {
      const os = [...updateRun.outcomes.values()]
      const ok = os.filter((o) => o.result === 'done').length
      const skipped = os.filter((o) => ['blocked', 'nochange', 'skipped'].includes(o.result)).length
      const bad = os.filter((o) => o.result === 'error').length
      const parts = [`${plural(ok, 'document')} ${updateRun.practice ? 'would be ' : ''}updated`]
      if (skipped) parts.push(`${skipped} skipped`)
      if (bad) parts.push(`${bad} failed`)
      return { tone: 'blue', text: `Finished${updateRun.practice ? ' (practice run, nothing changed)' : ''}: ${parts.join(', ')}.` }
    }
    if (counts) return { tone: 'amber', text: checkSentence(counts) }
    return { tone: 'green', text: `${plural(docs.length, 'document')} in the list. Tick the ones to check, then choose Check selected.` }
  })()

  const updatable = tickedDocs.filter((d) => d.checked && d.files)
  const canCheck = ticked.size > 0 && !running && comparedList.length > 0
  const canUpdate = updatable.length > 0 && !running
  const outcomeById = (id: string) => (mode === 'update' && done && updateRun ? updateRun.outcomes.get(id) : undefined)
  const tableDocs = docs.filter((d) => d.checked && d.files && checkedStatus(d, REPOS, comparedList) !== 'ok')

  const onToggleTable = useCallback((id: string) => setOpenTables((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n }), [])
  const onChoice = useCallback((id: string, c: DocChoice) => setChoices((cur) => ({ ...cur, [id]: c })), [])

  const pasteAdd = () => {
    const { ok, bad } = parsePasted(pasted)
    const msgs: string[] = []
    if (ok.length) msgs.push(`${plural(ok.length, 'address', 'addresses')} recognised. Test build: pasted addresses are not looked up, so use “By design cycle” or “Choose from Drive” to add the example documents.`)
    if (bad.length) msgs.push(`${bad.length === 1 ? 'This line is not a Google file address' : 'These lines are not Google file addresses'}: ${bad.map((b) => `“${b.length > 60 ? b.slice(0, 57) + '…' : b}”`).join(', ')}.`)
    setAddNote(msgs.join(' '))
    setPasted(bad.join('\n'))
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
      <div id="app-shell" className="flex flex-col flex-1 min-h-0">
        <header className={`flex items-center justify-between pr-4 bg-[#0033a0] text-white flex-shrink-0 ${isMac ? 'pl-20' : 'pl-4'}`} style={{ height: 36, WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <h1 className="text-sm font-black tracking-wide">GAS Updater</h1>
        </header>

        <nav aria-label="App controls" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 min-h-11 py-1.5 bg-white border-b border-gray-200 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <span className="text-xs text-gray-600">Update Blueprint Tools scripts in your Google documents</span>
          <div className="flex items-center gap-3 flex-wrap">
            <AccountMenu setup={setup} onSwitch={(k) => { setSetup({ ...setup, account: k }); announce(`Now using ${ACCOUNTS[k].email}.`) }} />
            <ZoomControl />
            <button type="button" onClick={() => setHelpOpen(true)} className={`flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-500 rounded-lg px-3 py-1.5 hover:bg-gray-50 ${FOCUS_RING}`}>
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" /> Help Center &amp; More
            </button>
          </div>
        </nav>

        <main className="flex-1 overflow-auto relative" id="main">
          <div className="max-w-2xl mx-auto pt-4 px-6 space-y-3.5">
            <div className="flex items-start gap-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
              <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p>
                <b>Test build.</b> Everything here is example data. The app does not connect to Google or GitHub yet, and nothing you do changes any real document. “Open” links go to Google, which will say the example file does not exist.
              </p>
            </div>

            <SetupPanel
              state={setup}
              onChange={setSetup}
              onChooseFromDrive={(field) => setPicker({ mode: 'single', kind: FIELD_INFO[field].kind, field, title: PICK_TITLE[field] })}
            />
          </div>

          {!setupDone ? (
            <p className="max-w-2xl mx-auto px-6 py-6 text-[13px] text-gray-700 text-center">The documents list appears once Initial setup is complete. Try “Choose from Drive” for the backup folder.</p>
          ) : (
            <section className="max-w-2xl mx-auto pt-6 pb-4 px-6 space-y-3.5" aria-labelledby="docs-heading">
              <fieldset disabled={running} className="space-y-3.5 min-w-0">
                {/* Add documents */}
                <div className="rounded-2xl border-2 p-4 border-gray-200 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-[#0033a0]" aria-hidden="true" />
                    <h2 className="font-black text-[15px]">Add documents</h2>
                  </div>
                  <p className="text-[13px] text-gray-600 mb-2.5">Add documents in any of these ways. They all go into the one list below, without duplicates.</p>
                  <label className="text-[13px] font-bold block mb-1" htmlFor="cycle">By design cycle</label>
                  <div className="flex gap-2">
                    <select id="cycle" className="flex-1 min-w-0 border-2 border-gray-500 rounded-xl px-3 py-2.5 text-sm bg-white">
                      <option>Spring 2027 (example projects)</option>
                    </select>
                    <button type="button" onClick={() => addDocs(DOCS.map((d) => d.id))} aria-describedby="cycle" className={`flex-shrink-0 px-4 rounded-xl border-2 border-[#0033a0] text-[#0033a0] font-black text-sm hover:bg-blue-50 ${FOCUS_RING}`}>
                      Add
                    </button>
                  </div>
                  <button type="button" onClick={() => setAddNote('Test build: the templates are not added to the list yet.')} className={`inline-flex items-center gap-1 mt-2 text-[12.5px] font-bold text-blue-700 underline rounded ${FOCUS_RING}`}>
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Add the blueprint and quiz questions templates
                  </button>
                  <div className="flex items-center gap-3 my-3 text-xs text-gray-600" aria-hidden="true"><span className="flex-1 border-t border-gray-200" />or<span className="flex-1 border-t border-gray-200" /></div>
                  <button type="button" onClick={() => setPicker({ mode: 'documents' })} className={`w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#0033a0] text-[#0033a0] hover:bg-blue-50 font-black text-sm px-4 py-2.5 ${FOCUS_RING}`}>
                    <Folder className="w-4 h-4" aria-hidden="true" />
                    Choose documents from Drive
                  </button>
                  <div className="flex items-center gap-3 my-3 text-xs text-gray-600" aria-hidden="true"><span className="flex-1 border-t border-gray-200" />or paste document addresses<span className="flex-1 border-t border-gray-200" /></div>
                  <div className="flex gap-2 items-stretch">
                    <textarea rows={2} value={pasted} onChange={(e) => setPasted(e.target.value)} aria-label="Document addresses, one per line" placeholder="One address per line: https://docs.google.com/document/d/…" className="flex-1 min-w-0 border-2 border-gray-500 rounded-xl px-3.5 py-2 text-sm resize-none focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-blue-200" />
                    <ActionButton enabled={!!pasted.trim()} onClick={pasteAdd} variant="outline" why="paste an address first" className="flex-shrink-0 px-4">
                      Add<span className="sr-only"> pasted addresses</span>
                    </ActionButton>
                  </div>
                  <p role="status" className="text-xs text-[#0a2a6b] mt-2 empty:hidden">{addNote}</p>
                </div>

                <h2 id="docs-heading" tabIndex={-1} className="text-[12px] text-gray-700 uppercase tracking-wide font-black px-1 pt-1 focus:outline-none">Documents</h2>

                {docs.length > 0 && (
                  <fieldset className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[13px]">
                    <legend className="sr-only">Check compares with</legend>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-bold" aria-hidden="true">Check compares with:</span>
                      {REPO_KEYS.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={compared.has(r)}
                            onChange={(e) => setCompared((c) => { const n = new Set(c); if (e.target.checked) n.add(r); else n.delete(r); return n })}
                            className="w-4 h-4 accent-[#0033a0]"
                          />
                          {REPO_NAME[r]} <span className="text-gray-600">({r === 'main' ? 'public' : 'private'})</span>
                        </label>
                      ))}
                    </div>
                    {!comparedList.length && <p className="text-xs text-red-700 mt-1">Tick at least one repo to compare with.</p>}
                  </fieldset>
                )}

                {statusLine && (
                  <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] ${statusLine.tone === 'green' ? 'bg-green-50 border-green-200 text-green-900' : statusLine.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-[#0a2a6b]'}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusLine.tone === 'green' ? 'bg-green-600' : statusLine.tone === 'amber' ? 'bg-amber-500' : 'bg-[#0033a0]'}`} aria-hidden="true" />
                    <span className="flex-1">{statusLine.text}</span>
                  </div>
                )}

                {docs.length === 0 ? (
                  <p className="text-[13px] text-gray-600 px-1">No documents yet. Add some above.</p>
                ) : (
                  <div className="rounded-xl border-2 border-gray-200 overflow-hidden bg-white">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticked.size === docs.length}
                          ref={(el) => { if (el) el.indeterminate = ticked.size > 0 && ticked.size < docs.length }}
                          onChange={(e) => setTicked(e.target.checked ? new Set(docs.map((d) => d.id)) : new Set())}
                          className="w-4 h-4 accent-[#0033a0]"
                        />
                        Select all
                      </label>
                      <span className="ml-auto text-[11px] text-gray-600 tabular-nums">{ticked.size} of {docs.length} selected</span>
                      {tableDocs.length > 0 && (
                        <button type="button" onClick={() => setOpenTables(openTables.size >= tableDocs.length ? new Set() : new Set(tableDocs.map((d) => d.id)))} className={`text-[11px] font-bold text-blue-700 underline rounded ${FOCUS_RING}`}>
                          {openTables.size >= tableDocs.length ? 'Close all tool tables' : 'Open all tool tables'}
                        </button>
                      )}
                      <button type="button" onClick={() => { setDocs([]); setTicked(new Set()); setCheckRun(null); setUpdateRun(null); setOpenTables(new Set()); resetRun() }} className={`text-[11px] font-bold text-gray-700 underline rounded ${FOCUS_RING}`}>
                        Clear list
                      </button>
                    </div>
                    {tableDocs.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
                        <span className="font-bold text-gray-800">Update every ticked blueprint from:</span>
                        {REPO_KEYS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              const ids = tickedDocs.filter((d) => d.files).map((d) => d.id)
                              setChoices((c) => ({ ...c, ...Object.fromEntries(ids.map((id) => [id, { doc: r, t: {} }])) }))
                              announce(`${plural(ids.length, 'ticked blueprint')} set to update from the ${REPO_NAME[r]}.`)
                            }}
                            className={`rounded-lg border-2 border-[#0033a0] text-[#0033a0] font-black px-2.5 py-1 hover:bg-blue-50 ${FOCUS_RING}`}
                          >
                            {REPO_NAME[r]}
                          </button>
                        ))}
                        <span className="text-gray-600">Resets each one’s tool choices.</span>
                      </div>
                    )}

                    <ul aria-label="Documents">
                      {docs.map((d) => {
                        const o = outcomeById(d.id)
                        const runCompared = checkRun?.compared ?? comparedList
                        const st = d.checked ? checkedStatus(d, REPOS, runCompared) : 'wait'
                        const showTable = d.checked && !!d.files && !o && st !== 'ok'
                        return (
                          <li key={d.id} className="border-t border-gray-100 first:border-t-0 px-3 py-2.5">
                            <div className="flex items-start gap-2.5">
                              <input type="checkbox" checked={ticked.has(d.id)} onChange={() => setTicked((t) => { const n = new Set(t); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n })} className="w-4 h-4 mt-0.5 accent-[#0033a0] flex-shrink-0" aria-label={d.name} />
                              <FileText className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" aria-hidden="true" />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <h3 className="text-[13.5px] font-black [overflow-wrap:anywhere]">{d.name}</h3>
                                  <Pill className={d.type === 'Quiz' ? 'bg-purple-100 text-purple-900' : 'bg-gray-100 text-gray-800'}>{d.type}</Pill>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                                  <AccountBadge who={d.account} />
                                  <OpenLink url={d.url} label={d.name} />
                                </div>
                                {o ? (
                                  o.result === 'error' ? (
                                    <div className="mt-1.5 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-[12.5px] text-red-800">
                                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-700" aria-hidden="true" />
                                      <div className="min-w-0">
                                        <p><ErrorText message={o.message!} /></p>
                                        <ErrorDetails message={o.message!} />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-700 mt-0.5">
                                      {o.result === 'done' ? (
                                        updateRun?.practice ? (
                                          `Practice run: ${plural(o.rows.filter((r) => r.res !== 'unchanged').length, 'file')} would change. Nothing was changed.`
                                        ) : (
                                          <>
                                            Backed up, updated, and checked against GitHub: every file matches what was chosen.{' '}
                                            <OpenLink url={BACKUP_URL} label={`for ${d.name}`}>Open backup</OpenLink>
                                          </>
                                        )
                                      ) : o.result === 'blocked' ? (
                                        'Skipped: it needs a choice first. Run Check again, then open “Tools and files” and pick one of the fixes.'
                                      ) : o.result === 'nochange' ? (
                                        'Nothing to update with the choices made.'
                                      ) : (
                                        o.message
                                      )}
                                    </p>
                                  )
                                ) : d.checked ? (
                                  <p className={`text-xs mt-0.5 ${st === 'perm' ? 'text-red-700' : 'text-gray-700'}`}>{checkedNote(d, REPOS, runCompared)}</p>
                                ) : null}
                              </div>
                              <span className="flex-shrink-0 text-right">
                                {o ? (
                                  o.result === 'done' ? (
                                    <Pill className="bg-green-100 text-green-800 inline-flex items-center gap-1"><Check className="w-3 h-3" aria-hidden="true" />{updateRun?.practice ? 'Would update' : 'Updated'}</Pill>
                                  ) : o.result === 'error' ? (
                                    <Pill className="bg-red-100 text-red-800">Not updated</Pill>
                                  ) : (
                                    <Pill className="bg-gray-100 text-gray-800">Skipped</Pill>
                                  )
                                ) : mode === 'update' && running && updateRun?.ids.includes(d.id) ? (
                                  <Pill className="bg-blue-100 text-[#0a2a6b] inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />Updating</Pill>
                                ) : (
                                  <Pill className={PILL[st][1]}>{PILL[st][0]}</Pill>
                                )}
                              </span>
                            </div>
                            {showTable && (
                              <ToolTable
                                docId={d.id}
                                docName={d.name}
                                doc={d.files!}
                                repos={REPOS}
                                compared={runCompared}
                                choice={choiceOf(d.id)}
                                open={openTables.has(d.id)}
                                onToggle={onToggleTable}
                                onChoice={onChoice}
                                announce={announce}
                              />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </fieldset>

              {mode !== 'none' && summary && (
                <RunPanel key={runKey} title={mode === 'check' ? 'Check' : 'Update'} summary={summary} lines={lines.slice(0, shown)} onClear={resetRun} />
              )}
            </section>
          )}

          {/* Always within reach, however long the list gets. */}
          {setupDone && docs.length > 0 && (
            <div className="sticky bottom-0 z-20 border-t border-gray-300 bg-white/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <div className="max-w-2xl mx-auto px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={practice} disabled={running} onChange={(e) => setPractice(e.target.checked)} className="w-4 h-4 accent-[#0033a0]" />
                  <span><b>Practice run</b> <span className="text-gray-600">(changes nothing)</span></span>
                </label>
                <span className="text-xs text-gray-700 tabular-nums">
                  {running ? (mode === 'check' ? 'Checking…' : 'Updating…') : `${ticked.size} ticked`}
                </span>
                <div className="ml-auto flex gap-2">
                  <ActionButton enabled={canCheck} onClick={runCheck} variant="outline" why={running ? 'wait for the current run to finish' : !comparedList.length ? 'tick a repo to compare with' : 'tick at least one document'} className="px-4 py-2">
                    Check selected
                  </ActionButton>
                  <ActionButton
                    enabled={canUpdate}
                    onClick={() => setConfirming(true)}
                    variant={practice ? 'primary' : 'danger'}
                    why={running ? 'wait for the current run to finish' : 'run Check on the ticked documents first'}
                    className="px-4 py-2"
                  >
                    {practice ? 'Update selected (practice)' : 'Update selected'}
                  </ActionButton>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {picker && (
        <DrivePicker
          request={picker}
          account={setup.account}
          onClose={() => setPicker(null)}
          fallbackFocus={() => document.getElementById('docs-heading') ?? document.getElementById('setup-toggle')}
          onAddDocuments={(ids) => { addDocs(ids); setPicker(null) }}
          onPickOne={(name) => {
            if (picker.field) {
              setSetup({ ...setup, [picker.field]: name })
              announce(`${FIELD_INFO[picker.field].label}: ${name} chosen.`)
            }
            setPicker(null)
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          docs={tickedDocs}
          outcomes={pendingOutcomes}
          choiceOf={choiceOf}
          repos={REPOS}
          practice={practice}
          onPractice={setPractice}
          onCancel={() => setConfirming(false)}
          onStart={startUpdate}
          onGoTo={goToDoc}
        />
      )}

      {helpOpen && (
        <Modal labelledBy="help-title" onClose={() => setHelpOpen(false)} width="max-w-md">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0033a0] text-white">
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <h2 id="help-title" className="font-black text-[15px]">Help Center &amp; More</h2>
            <button type="button" onClick={() => setHelpOpen(false)} aria-label="Close" className="ml-auto rounded p-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 text-[13px] text-gray-700 space-y-2">
            <p>The Help Center article comes later, as in the other eCampus apps.</p>
            <p>Things to try in this test build: finish Initial setup, add documents, Check, change tool choices, then Update with and without Practice run.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
