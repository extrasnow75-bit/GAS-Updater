import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HelpCircle, AlertCircle, ChevronDown, FileText, Folder, Plus, FlaskConical, X, Check, Loader2 } from 'lucide-react'
import { ZoomControl } from './components/ZoomControl'
import { ErrorText, ErrorDetails } from './components/ErrorText'
import { SetupPanel, setupRemaining, type SetupField, type SetupState, FIELD_INFO } from './components/SetupPanel'
import { DrivePicker, type PickerRequest } from './components/DrivePicker'
import { ToolTable } from './components/ToolTable'
import { RunPanel, type RunSummary } from './components/RunPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { AccountBadge, OpenLink, PILL, Pill } from './components/ui'
import { ACCOUNTS, DOCS, REPOS, START_CHOICES } from './logic/exampleData'
import type { DocChoice, FileSet, Repos } from './logic/compare'
import { checkLines, checkedNote, checkedStatus, exportRows, outcomeFor, updateLines, type Line, type ListDoc, type UpdateOutcome } from './logic/run'

const isMac = window.api?.app?.platform === 'darwin'

const START_SETUP: SetupState = {
  account: 'GS',
  signedIn: { GS: true, EX: true },
  token: '',
  semesterList: 'Multi-Semester List · tab “Projects”',
  backupFolder: '',
  history: '',
  blueprintTemplate: 'Copy of Template Blueprint 6.0 for GAS Test (Nov 2026)',
  quizTemplate: '',
}

type Mode = 'none' | 'check' | 'update'

function AccountMenu({ setup, onSwitch }: { setup: SetupState; onSwitch(k: 'GS' | 'EX'): void }) {
  const [open, setOpen] = useState(false)
  const a = ACCOUNTS[setup.account]
  const others = (['GS', 'EX'] as const).filter((k) => k !== setup.account && setup.signedIn[k])
  if (!setup.signedIn[setup.account]) return null
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-bold text-gray-700 border border-gray-500 rounded-lg pl-1 pr-2 py-1 hover:bg-gray-50">
        <AccountBadge who={setup.account} size="md" />
        <span>{a.email}</span>
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 z-30 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-1 text-[13px]">
          {others.length ? (
            others.map((k) => (
              <button key={k} role="menuitem" type="button" onClick={() => { onSwitch(k); setOpen(false) }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 text-left">
                <AccountBadge who={k} size="md" />
                Use {ACCOUNTS[k].email}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-2 text-gray-600">Sign in to a second account in Initial setup to switch here.</p>
          )}
        </div>
      )}
    </div>
  )
}

function fmtElapsed(ms: number) {
  const s = Math.round(ms / 1000)
  return `Elapsed: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function App() {
  const [setup, setSetup] = useState<SetupState>(START_SETUP)
  const [picker, setPicker] = useState<(PickerRequest & { field?: SetupField }) | null>(null)
  const [docs, setDocs] = useState<ListDoc[]>([])
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [choices, setChoices] = useState<Record<string, DocChoice>>(START_CHOICES)
  const [practice, setPractice] = useState(true)
  const [compareMain, setCompareMain] = useState(true)
  const [compareExp, setCompareExp] = useState(true)
  const [mode, setMode] = useState<Mode>('none')
  const [lines, setLines] = useState<Line[]>([])
  const [shown, setShown] = useState(0)
  const [started, setStarted] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [outcomes, setOutcomes] = useState<UpdateOutcome[]>([])
  const [confirming, setConfirming] = useState(false)
  const [updatedRun, setUpdatedRun] = useState<{ docs: ListDoc[]; outcomes: UpdateOutcome[]; practice: boolean; when: Date } | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [addNote, setAddNote] = useState('')
  const [repos] = useState<Repos>(REPOS)
  const pendingFiles = useRef<Record<string, FileSet>>({})

  const setupDone = setupRemaining(setup).length === 0
  const running = mode !== 'none' && shown < lines.length

  // Reveal timeline lines one at a time, so a run looks like a run.
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => {
      setShown((n) => n + 1)
      setNow(Date.now())
    }, 110)
    return () => clearTimeout(t)
  }, [running, shown])

  // When an update finishes for real, the example documents take on their new scripts.
  useEffect(() => {
    if (mode === 'update' && !running && Object.keys(pendingFiles.current).length) {
      const next = pendingFiles.current
      pendingFiles.current = {}
      setDocs((ds) => ds.map((d) => (next[d.id] ? { ...d, files: next[d.id], checked: false } : d)))
    }
  }, [mode, running])

  const addDocs = useCallback(
    (ids: string[]) => {
      const have = new Set(docs.map((d) => d.id))
      const fresh: ListDoc[] = DOCS.filter((d) => ids.includes(d.id) && !have.has(d.id)).map((d) => ({ ...d, account: setup.account, checked: false }))
      setAddNote(fresh.length ? `${fresh.length} document${fresh.length === 1 ? '' : 's'} added.` : 'Those documents are already in the list.')
      setTicked((t) => new Set([...t, ...fresh.map((d) => d.id)]))
      setDocs([...docs, ...fresh])
    },
    [docs, setup.account],
  )

  const tickedDocs = docs.filter((d) => ticked.has(d.id))
  const checkedCount = docs.filter((d) => d.checked).length

  const runCheck = () => {
    const ds = tickedDocs
    setDocs((cur) => cur.map((d) => (ticked.has(d.id) ? { ...d, checked: true } : d)))
    const L = checkLines(ds, repos)
    setLines(L)
    setShown(1)
    setStarted(Date.now())
    setMode('check')
    setUpdatedRun(null)
    // Tick the ones that need updating, as the mockup does.
    setTicked(new Set(ds.filter((d) => ['out', 'extra'].includes(checkedStatus(d, repos))).map((d) => d.id)))
  }

  const prepareUpdate = () => {
    setOutcomes(tickedDocs.map((d) => outcomeFor(d, repos, choices[d.id])))
    setConfirming(true)
  }

  const startUpdate = () => {
    const ds = tickedDocs
    const os = ds.map((d) => outcomeFor(d, repos, choices[d.id]))
    const when = new Date()
    setConfirming(false)
    setOutcomes(os)
    setLines(updateLines(ds, os, practice, when))
    setShown(1)
    setStarted(Date.now())
    setMode('update')
    setUpdatedRun({ docs: ds, outcomes: os, practice, when })
    if (!practice) for (const o of os) if (o.after) pendingFiles.current[o.id] = o.after
  }

  const summary: RunSummary | null = useMemo(() => {
    if (mode === 'none') return null
    const done = shown >= lines.length
    const progress = lines.length ? Math.min(1, shown / lines.length) : 1
    const elapsed = fmtElapsed((done ? started + lines.length * 110 : now) - started)
    if (mode === 'check') {
      const cs = docs.filter((d) => d.checked)
      const need = cs.filter((d) => ['out', 'extra'].includes(checkedStatus(d, repos))).length
      const perm = cs.filter((d) => d.status === 'perm').map((d) => d.name)
      const none = cs.filter((d) => d.status === 'none').map((d) => d.name)
      const wrong = [
        ...(perm.length ? [{ cause: 'You can view this document but not edit it.', fix: 'Ask the document’s owner for edit access, then run Check again.', docs: perm }] : []),
        ...(none.length ? [{ cause: 'The document’s script could not be found.', fix: 'Open the document once so its script can be found, or paste its script ID.', docs: none }] : []),
      ]
      return {
        ok: done ? `${need} document${need === 1 ? '' : 's'} need${need === 1 ? 's' : ''} updating` : 'Checking…',
        bad: done && perm.length + none.length ? `${perm.length + none.length} could not be checked` : undefined,
        done,
        progress,
        elapsed,
        wrong,
      }
    }
    const r = updatedRun!
    const ok = r.outcomes.filter((o) => o.result === 'done').length
    const failed = r.outcomes.filter((o) => o.result === 'error')
    return {
      ok: done ? (r.practice ? `Practice run: ${ok} document${ok === 1 ? '' : 's'} would be updated` : `${ok} document${ok === 1 ? '' : 's'} updated successfully`) : r.practice ? 'Practice run…' : 'Updating…',
      bad: done && failed.length ? `${failed.length} failed` : undefined,
      done,
      progress,
      elapsed,
      wrong: failed.length ? [{ cause: 'You can view this document but not edit it.', fix: 'Ask the document’s owner for edit access, then try again.', docs: failed.map((o) => r.docs.find((d) => d.id === o.id)!.name) }] : [],
      exportRows: exportRows(r.docs, r.outcomes, ACCOUNTS[setup.account].email, r.practice, r.when),
      practice: r.practice,
    }
  }, [mode, shown, lines, started, now, docs, repos, updatedRun, setup.account])

  const statusLine = (() => {
    if (!docs.length) return null
    if (mode === 'update' && summary?.done && updatedRun) {
      const ok = updatedRun.outcomes.filter((o) => o.result === 'done').length
      const bad = updatedRun.outcomes.filter((o) => o.result === 'error').length
      return { tone: 'blue', text: `Finished${updatedRun.practice ? ' (practice run)' : ''}: ${ok} document${ok === 1 ? '' : 's'} ${updatedRun.practice ? 'would be ' : ''}updated${bad ? `, ${bad} not updated` : ''}.` }
    }
    if (checkedCount) {
      const cs = docs.filter((d) => d.checked)
      const need = cs.filter((d) => ['out', 'extra'].includes(checkedStatus(d, repos))).length
      const bad = cs.filter((d) => d.status === 'perm' || d.status === 'none').length
      const quiz = cs.filter((d) => d.type === 'Quiz').length
      return { tone: 'amber', text: `Checked ${cs.length} document${cs.length === 1 ? '' : 's'}: ${need} need updating${bad ? `, ${bad} could not be checked` : ''}${quiz ? `, ${quiz} quiz${quiz === 1 ? '' : 'zes'} skipped` : ''}.` }
    }
    return { tone: 'green', text: `${docs.length} document${docs.length === 1 ? '' : 's'} added. Tick the ones to check or update.` }
  })()

  const canUpdate = tickedDocs.some((d) => d.checked && d.files)
  const outcomeById = (id: string) => (mode === 'update' && summary?.done ? updatedRun?.outcomes.find((o) => o.id === id) : undefined)

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="flex flex-col flex-1 min-h-0">
        <header className={`flex items-center justify-between pr-4 bg-[#0033a0] text-white flex-shrink-0 ${isMac ? 'pl-20' : 'pl-4'}`} style={{ height: 36, WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <h1 className="text-sm font-black tracking-wide">GAS Updater</h1>
        </header>

        <nav aria-label="App controls" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 min-h-11 py-1.5 bg-white border-b border-gray-200 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <span className="text-xs text-gray-600">Push the latest Apps Script from GitHub into your Google documents</span>
          <div className="flex items-center gap-3 flex-wrap">
            <AccountMenu setup={setup} onSwitch={(k) => setSetup({ ...setup, account: k })} />
            <ZoomControl />
            <button type="button" onClick={() => setHelpOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-500 rounded-lg px-3 py-1.5 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0033a0]">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" /> Help Center &amp; More
            </button>
          </div>
        </nav>

        <main className="flex-1 overflow-auto relative">
          <div className="max-w-2xl mx-auto pt-4 px-6 space-y-3.5">
            <div className="flex items-start gap-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
              <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p>
                <b>Test build.</b> Everything here is example data. The app does not connect to Google or GitHub yet, and nothing you do changes any real document. “Open” links go to Google, which will say the example file does not exist.
              </p>
            </div>

            <SetupPanel state={setup} onChange={setSetup} onChooseFromDrive={(field) => setPicker({ mode: 'single', kind: FIELD_INFO[field].kind, field, title: `Choose: ${FIELD_INFO[field].label}` })} />
          </div>

          {!setupDone ? (
            <p className="max-w-2xl mx-auto px-6 py-6 text-[13px] text-gray-700 text-center">The documents list appears once Initial setup is complete. Try “Choose from Drive” for the backup folder.</p>
          ) : (
            <section className="max-w-2xl mx-auto py-6 px-6 space-y-3.5" aria-label="Documents">
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
                  <button type="button" onClick={() => addDocs(DOCS.map((d) => d.id))} className="flex-shrink-0 px-4 rounded-xl border-2 border-[#0033a0] text-[#0033a0] font-black text-sm hover:bg-blue-50">
                    Add
                  </button>
                </div>
                <button type="button" onClick={() => setAddNote('Test build: the templates are not added to the list yet.')} className="inline-flex items-center gap-1 mt-2 text-[12.5px] font-bold text-blue-600 underline">
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add the blueprint and quiz questions templates
                </button>
                <div className="flex items-center gap-3 my-3 text-xs text-gray-600"><span className="flex-1 border-t border-gray-200" />or<span className="flex-1 border-t border-gray-200" /></div>
                <button type="button" onClick={() => setPicker({ mode: 'documents' })} className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#0033a0] text-[#0033a0] hover:bg-blue-50 font-black text-sm px-4 py-2.5">
                  <Folder className="w-4 h-4" aria-hidden="true" />
                  Choose from Drive
                </button>
                <div className="flex items-center gap-3 my-3 text-xs text-gray-600"><span className="flex-1 border-t border-gray-200" />or paste document addresses<span className="flex-1 border-t border-gray-200" /></div>
                <div className="flex gap-2 items-stretch">
                  <textarea rows={2} value={pasted} onChange={(e) => setPasted(e.target.value)} aria-label="Document addresses" placeholder="One address per line: https://docs.google.com/document/d/…" className="flex-1 min-w-0 border-2 border-gray-500 rounded-xl px-3.5 py-2 text-sm resize-none" />
                  <button
                    type="button"
                    disabled={!pasted.trim()}
                    onClick={() => {
                      setPasted('')
                      setAddNote('Test build: pasted addresses are not looked up. Use “By design cycle” or “Choose from Drive” to add the example documents.')
                    }}
                    className={`flex-shrink-0 px-4 rounded-xl border-2 font-black text-sm ${pasted.trim() ? 'border-[#0033a0] text-[#0033a0] hover:bg-blue-50' : 'border-gray-300 text-gray-500'}`}
                  >
                    Add
                  </button>
                </div>
                <p role="status" className="text-xs text-[#0a2a6b] mt-2 empty:hidden">{addNote}</p>
              </div>

              <h2 className="text-[12px] text-gray-700 uppercase tracking-wide font-black px-1 pt-1">Documents</h2>
              {statusLine && (
                <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] ${statusLine.tone === 'green' ? 'bg-green-50 border-green-200 text-green-900' : statusLine.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-[#0a2a6b]'}`}>
                  <span className={`w-2 h-2 rounded-full ${statusLine.tone === 'green' ? 'bg-green-600' : statusLine.tone === 'amber' ? 'bg-amber-500' : 'bg-[#0033a0]'}`} />
                  <span className="flex-1">{statusLine.text}</span>
                </div>
              )}

              {docs.length === 0 ? (
                <p className="text-[13px] text-gray-600 px-1">No documents yet. Add some above.</p>
              ) : (
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden bg-white">
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ticked.size === docs.length}
                        ref={(el) => { if (el) el.indeterminate = ticked.size > 0 && ticked.size < docs.length }}
                        onChange={(e) => setTicked(e.target.checked ? new Set(docs.map((d) => d.id)) : new Set())}
                        className="w-3.5 h-3.5 accent-[#0033a0]"
                      />
                      Select all
                    </label>
                    <span className="ml-auto text-[11px] text-gray-600 tabular-nums">{ticked.size} of {docs.length} selected</span>
                    <button type="button" onClick={() => { setDocs([]); setTicked(new Set()); setMode('none'); setLines([]) }} className="text-[11px] font-bold text-gray-600 underline">
                      Clear list
                    </button>
                  </div>
                  {checkedCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
                      <span className="font-bold text-gray-800">Update every ticked blueprint from:</span>
                      {(['main', 'exp'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => setChoices((c) => ({ ...c, ...Object.fromEntries(tickedDocs.filter((d) => d.files).map((d) => [d.id, { doc: r, t: {} }])) }))} className="rounded-lg border-2 border-[#0033a0] text-[#0033a0] font-black px-2.5 py-1 hover:bg-blue-50">
                          {r === 'main' ? 'Main Repo' : 'Experimental Repo'}
                        </button>
                      ))}
                      <span className="text-gray-600">Resets each one’s tool choices.</span>
                    </div>
                  )}

                  {docs.map((d, i) => {
                    const o = outcomeById(d.id)
                    const st = d.checked ? checkedStatus(d, repos) : 'wait'
                    const showTable = d.checked && !!d.files && !o
                    return (
                      <div key={d.id} className="flex items-start gap-2.5 border-t border-gray-100 first:border-t-0 px-3 py-2">
                        <input type="checkbox" checked={ticked.has(d.id)} onChange={() => setTicked((t) => { const n = new Set(t); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })} className="w-3.5 h-3.5 mt-1 accent-[#0033a0] flex-shrink-0" aria-label={d.name} />
                        <FileText className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <b className="text-[13.5px] [overflow-wrap:anywhere]">{d.name}</b>
                            <Pill className={d.type === 'Quiz' ? 'bg-purple-100 text-purple-900' : 'bg-gray-100 text-gray-800'}>{d.type}</Pill>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                            <AccountBadge who={d.account} />
                            <OpenLink url={d.url} />
                          </div>
                          {o ? (
                            o.result === 'error' ? (
                              <div className="mt-1.5 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-[12.5px] text-red-800">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-700" aria-hidden="true" />
                                <div className="min-w-0">
                                  <p role="alert"><ErrorText message={o.message!} /></p>
                                  <ErrorDetails message={o.message!} />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {o.result === 'done'
                                  ? updatedRun?.practice
                                    ? `Practice run: ${o.rows.filter((r) => r.res !== 'unchanged').length} files would change. Nothing was changed.`
                                    : 'Backed up, updated, and checked against GitHub: every file matches what was chosen.'
                                  : o.result === 'blocked'
                                    ? 'Skipped until its choices are fixed. Run Check again to see them.'
                                    : o.result === 'nochange'
                                      ? 'Nothing to update with the choices made.'
                                      : o.message}
                              </p>
                            )
                          ) : d.checked ? (
                            <p className={`text-xs mt-0.5 ${st === 'perm' ? 'text-red-700' : 'text-gray-600'}`}>{checkedNote(d, repos)}</p>
                          ) : null}
                          {showTable && st !== 'ok' && (
                            <ToolTable docId={d.id} doc={d.files!} repos={repos} choice={choices[d.id] ?? { doc: 'main', t: {} }} onChoice={(c) => setChoices((cur) => ({ ...cur, [d.id]: c }))} defaultOpen={i === 0} />
                          )}
                        </div>
                        <span className="flex-shrink-0 text-right">
                          {o ? (
                            o.result === 'done' ? (
                              <Pill className="bg-green-100 text-green-800 inline-flex items-center gap-1"><Check className="w-3 h-3" aria-hidden="true" />{updatedRun?.practice ? 'Would update' : 'Updated'}</Pill>
                            ) : o.result === 'error' ? (
                              <Pill className="bg-red-100 text-red-800">Not updated</Pill>
                            ) : (
                              <Pill className="bg-gray-100 text-gray-800">Skipped</Pill>
                            )
                          ) : mode === 'update' && running && ticked.has(d.id) ? (
                            <Pill className="bg-blue-100 text-[#0a2a6b] inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />Updating</Pill>
                          ) : (
                            <Pill className={PILL[st][1]}>{PILL[st][0]}</Pill>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Actions */}
              {docs.length > 0 && (
                <div className="rounded-2xl border-2 p-4 border-gray-200 bg-white space-y-3">
                  <label className="flex items-start gap-2 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={practice} onChange={(e) => setPractice(e.target.checked)} className="w-3.5 h-3.5 mt-0.5 accent-[#0033a0]" />
                    <span><b>Practice run</b> <span className="text-gray-600">(on by default): does every step, including the backup check, but changes no scripts.</span></span>
                  </label>
                  <fieldset className="text-[13px]">
                    <legend><b>Compare with</b> <span className="text-gray-600">(Check looks at every ticked repo at once)</span></legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={compareMain} onChange={(e) => setCompareMain(e.target.checked)} className="w-3.5 h-3.5 accent-[#0033a0]" />Main Repo (public)</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={compareExp} onChange={(e) => setCompareExp(e.target.checked)} className="w-3.5 h-3.5 accent-[#0033a0]" />Experimental Repo (private)</label>
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!ticked.size || running || (!compareMain && !compareExp)} onClick={runCheck} className={`flex-1 min-w-[10rem] py-2.5 rounded-xl border-2 font-black text-sm ${ticked.size && !running ? 'border-[#0033a0] text-[#0033a0] hover:bg-blue-50' : 'border-gray-300 text-gray-500'}`}>
                      Check selected
                    </button>
                    <button type="button" disabled={!canUpdate || running} onClick={prepareUpdate} className={`flex-1 min-w-[10rem] py-2.5 rounded-xl text-sm font-black ${canUpdate && !running ? 'bg-[#0033a0] text-white hover:bg-[#002d8f]' : 'bg-gray-200 text-gray-700'}`}>
                      Update selected
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    {!checkedCount
                      ? 'Run Check first. Update becomes available for documents that are out of date.'
                      : `${ticked.size} document${ticked.size === 1 ? '' : 's'} ticked. Choose where each one updates from, then Update. Practice run is ${practice ? 'on' : 'off'}.`}
                    {!compareMain && !compareExp && ' Tick at least one repo to compare with.'}
                  </p>
                </div>
              )}

              {mode !== 'none' && summary && (
                <RunPanel title={mode === 'check' ? 'Check' : 'Update'} summary={summary} lines={lines.slice(0, shown)} onClear={() => { setLines([]); setShown(0); setMode('none') }} />
              )}
            </section>
          )}
        </main>
      </div>

      {picker && (
        <DrivePicker
          request={picker}
          account={setup.account}
          onClose={() => setPicker(null)}
          onAddDocuments={(ids) => { addDocs(ids); setPicker(null) }}
          onPickOne={(name) => { if (picker.field) setSetup({ ...setup, [picker.field]: name }); setPicker(null) }}
        />
      )}

      {confirming && (
        <ConfirmDialog docs={tickedDocs} outcomes={outcomes} choices={choices} repos={repos} practice={practice} onPractice={setPractice} onCancel={() => setConfirming(false)} onStart={startUpdate} />
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/40 flex items-start justify-center p-6" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setHelpOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0033a0] text-white">
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              <h2 id="help-title" className="font-black text-[15px]">Help Center &amp; More</h2>
              <button type="button" autoFocus onClick={() => setHelpOpen(false)} aria-label="Close" className="ml-auto rounded p-0.5 hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 text-[13px] text-gray-700 space-y-2">
              <p>The Help Center article comes later, as in the other eCampus apps.</p>
              <p>Things to try in this test build: finish Initial setup, add documents, Check, change tool choices, then Update with and without Practice run.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
