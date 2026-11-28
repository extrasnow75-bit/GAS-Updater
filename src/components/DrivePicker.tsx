/**
 * Choose from Drive: the app's own Drive browser (Google's Picker cannot run inside a
 * desktop app). Tick boxes for files of any type and for whole folders, an Open link on
 * every file, and long names that wrap. TEST BUILD: the Drive shown is example data.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Folder, FileText, FileSpreadsheet, Presentation, ListChecks, ChevronRight, Search, X } from 'lucide-react'
import { ActionButton, FOCUS_RING, OpenLink, Pill, Segmented } from './ui'
import { ACCOUNTS } from '../logic/exampleData'

export type Kind = 'folder' | 'doc' | 'sheet' | 'slides' | 'form'
export interface DriveItem {
  id: string
  name: string
  kind: Kind
  children?: DriveItem[]
  /** Which example document this is, if it is one the app can check. */
  docId?: string
}

const url = (it: DriveItem) =>
  it.kind === 'folder'
    ? `https://drive.google.com/drive/folders/EXAMPLE-${it.id}`
    : `https://docs.google.com/${it.kind === 'doc' ? 'document' : it.kind === 'sheet' ? 'spreadsheets' : it.kind === 'slides' ? 'presentation' : 'forms'}/d/EXAMPLE-${it.id}/edit`

const SPRING: DriveItem = {
  id: 'spring', name: 'Spring 2027', kind: 'folder', children: [
    { id: 'f-biol', name: 'BIOL 1010', kind: 'folder', children: [
      { id: 'd-biol', name: 'BIOL 1010 Blueprint', kind: 'doc', docId: 'biol' },
      { id: 'd-bquiz', name: 'BIOL 1010 Module 3 Quiz', kind: 'doc', docId: 'quiz' },
      { id: 's-bvid', name: 'BIOL 1010 Video List', kind: 'sheet' },
      { id: 'p-bkick', name: 'BIOL 1010 Kickoff Slides', kind: 'slides' },
    ] },
    { id: 'f-hlth', name: 'HLTH 2200', kind: 'folder', children: [
      { id: 'd-hlth', name: 'HLTH 2200 Blueprint', kind: 'doc', docId: 'hlth' },
      { id: 'd-hquiz', name: 'HLTH 2200 Introduction to Community and Public Health: Final Exam Quiz Questions (Fall 2026 revision)', kind: 'doc', docId: 'hquiz' },
    ] },
    { id: 'f-nurs', name: 'NURS 4100', kind: 'folder', children: [{ id: 'd-nurs', name: 'NURS 4100 Blueprint', kind: 'doc', docId: 'nurs' }] },
    { id: 'f-hist', name: 'HIST 1120', kind: 'folder', children: [{ id: 'd-hist', name: 'HIST 1120 Blueprint', kind: 'doc', docId: 'hist' }] },
    { id: 'd-psyc', name: 'PSYC 3015 Blueprint', kind: 'doc', docId: 'psyc' },
    { id: 's-track', name: 'Spring 2027 eCampus course development tracking sheet (instructional design team, updated weekly)', kind: 'sheet' },
    { id: 'p-kick', name: 'Spring 2027 kickoff', kind: 'slides' },
    { id: 'm-intake', name: 'Faculty intake form', kind: 'form' },
  ],
}
const ECAMPUS: DriveItem = {
  id: 'ecampus', name: 'eCampus Projects', kind: 'folder', children: [
    SPRING,
    { id: 'f-backups', name: 'Script backups', kind: 'folder', children: [] },
    { id: 's-msl', name: 'Multi-Semester List', kind: 'sheet' },
    { id: 's-hist', name: 'GAS Updater update history', kind: 'sheet' },
    { id: 'd-tbp', name: 'Copy of Template Blueprint 6.0 for GAS Test (Nov 2026)', kind: 'doc' },
    { id: 'd-tqz', name: 'Template Quiz', kind: 'doc' },
  ],
}
const ROOT: DriveItem = { id: 'root', name: 'My Drive', kind: 'folder', children: [ECAMPUS] }

const KIND_LABEL: Record<Kind, string> = { folder: 'Folder', doc: 'Google Doc', sheet: 'Google Sheet', slides: 'Google Slides', form: 'Google Form' }

function KindIcon({ kind }: { kind: Kind }) {
  const cls = 'w-4 h-4 mt-px flex-shrink-0'
  if (kind === 'folder') return <Folder className={`${cls} text-gray-600`} aria-hidden="true" />
  if (kind === 'sheet') return <FileSpreadsheet className={`${cls} text-green-700`} aria-hidden="true" />
  if (kind === 'slides') return <Presentation className={`${cls} text-amber-600`} aria-hidden="true" />
  if (kind === 'form') return <ListChecks className={`${cls} text-purple-700`} aria-hidden="true" />
  return <FileText className={`${cls} text-blue-600`} aria-hidden="true" />
}

function allFiles(it: DriveItem, deep: boolean): DriveItem[] {
  return (it.children ?? []).flatMap((c) => (c.kind === 'folder' ? (deep ? allFiles(c, deep) : []) : [c]))
}
const looksLikeDoc = (it: DriveItem) => it.kind === 'doc' && /blueprint|quiz/i.test(it.name)
const docType = (it: DriveItem) => (/quiz/i.test(it.name) ? 'Quiz' : /blueprint/i.test(it.name) ? 'Blueprint' : null)

export interface PickerRequest {
  /** 'documents': many files and folders, for the list. 'single': one item of one kind, for Initial setup. */
  mode: 'documents' | 'single'
  kind?: Kind
  title?: string
}

const KIND_PLURAL: Record<Kind, string> = { folder: 'folders', doc: 'Google Docs', sheet: 'Google Sheets', slides: 'Google Slides files', form: 'Google Forms' }

export function DrivePicker({
  request,
  account,
  onClose,
  onAddDocuments,
  onPickOne,
  fallbackFocus,
}: {
  request: PickerRequest
  account: 'GS' | 'EX'
  onClose(): void
  onAddDocuments(docIds: string[]): void
  onPickOne(name: string): void
  fallbackFocus?: () => HTMLElement | null
}) {
  const single = request.mode === 'single'
  const [path, setPath] = useState<DriveItem[]>(single ? [ROOT, ECAMPUS] : [ROOT, ECAMPUS, SPRING])
  const [tab, setTab] = useState<'mine' | 'shared' | 'with'>('mine')
  const [query, setQuery] = useState('')
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [one, setOne] = useState<DriveItem | null>(null)
  const [deep, setDeep] = useState(true)
  const [step, setStep] = useState<1 | 2>(1)
  const [step2, setStep2] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const here = path[path.length - 1]

  // After going into or out of a folder, or between steps, put focus on the new content
  // instead of letting it fall back to the top of the page.
  useEffect(() => {
    if (!moved.current) return
    if (step === 2) step2Ref.current?.focus()
    else listRef.current?.focus()
  }, [path, step])
  const go = (p: DriveItem[]) => {
    moved.current = true
    setPath(p)
    setQuery('')
  }

  const items = useMemo(() => {
    const list = here.children ?? []
    const q = query.trim().toLowerCase()
    return q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list
  }, [here, query])

  const index = useMemo(() => {
    const m = new Map<string, DriveItem>()
    const walk = (i: DriveItem) => {
      m.set(i.id, i)
      i.children?.forEach(walk)
    }
    walk(ROOT)
    return m
  }, [])

  const tickedItems = [...ticked].map((id) => index.get(id)).filter((x): x is DriveItem => !!x)
  const nFolders = tickedItems.filter((i) => i.kind === 'folder').length
  const nFiles = tickedItems.length - nFolders
  const nonDocs = tickedItems.filter((i) => i.kind !== 'folder' && i.kind !== 'doc').length
  const toggle = (id: string) => {
    const next = new Set(ticked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setTicked(next)
  }

  const folderGroups = tickedItems.filter((i) => i.kind === 'folder').map((f) => ({ f, files: allFiles(f, deep) }))
  /** Everything that would be added, each file once even if it was ticked twice. */
  const finalFiles = (): DriveItem[] => {
    const m = new Map<string, DriveItem>()
    for (const f of tickedItems) if (f.kind !== 'folder') m.set(f.id, f)
    for (const id of step2) {
      const f = index.get(id)
      if (f) m.set(f.id, f)
    }
    return [...m.values()]
  }
  const finalCount = finalFiles().length
  const finalDocIds = () => [...new Set(finalFiles().map((f) => f.docId).filter((x): x is string => !!x))]
  const goStep2 = () => {
    setStep2(new Set(folderGroups.flatMap((g) => g.files.filter(looksLikeDoc).map((x) => x.id))))
    moved.current = true
    setStep(2)
  }

  const selectable = (it: DriveItem) => !single || it.kind === request.kind
  const countText = single
    ? one
      ? `Selected: ${one.name}`
      : `Choose one ${request.kind === 'folder' ? 'folder' : KIND_LABEL[request.kind ?? 'doc']}`
    : `${ticked.size} selected (${nFolders} folder${nFolders === 1 ? '' : 's'}, ${nFiles} file${nFiles === 1 ? '' : 's'})`

  return (
    <Modal labelledBy="picker-title" onClose={onClose} initialFocus="input[aria-label='Search this folder']" fallbackFocus={fallbackFocus}>
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0033a0] text-white">
        <Folder className="w-4 h-4" aria-hidden="true" />
        <h2 id="picker-title" className="font-black text-[15px]">{request.title ?? 'Choose from Drive'}</h2>
        <span className="ml-auto text-xs font-bold flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-white text-[#0033a0] text-[8px] font-black flex items-center justify-center" aria-hidden="true">{account}</span>
          <span className="sr-only">Browsing as </span>
          {ACCOUNTS[account].email}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p role="status" className="sr-only">{step === 1 ? countText : `${finalCount} files ticked`}</p>

      {step === 1 ? (
        <>
          <div className="p-3 space-y-2.5">
            {single && <p className="text-[12.5px] text-gray-700">Only {KIND_PLURAL[request.kind ?? 'doc']} can be chosen here. Use “Look inside” to open a folder.</p>}
            <div className="flex flex-wrap gap-2 items-center">
              <Segmented<'mine' | 'shared' | 'with'>
                name="drive-where"
                label="Where to look"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'mine', label: 'My Drive' },
                  { value: 'shared', label: 'Shared drives' },
                  { value: 'with', label: 'Shared with me' },
                ]}
              />
              <div className="relative flex-1 min-w-[10rem]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" aria-hidden="true" />
                <input aria-label="Search this folder" placeholder="Search this folder" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full border-2 border-gray-500 rounded-lg pl-8 pr-2.5 py-1.5 text-[13px] focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>

            {tab === 'mine' ? (
              <>
                <nav aria-label="Folder path">
                  <ol className="text-xs text-gray-700 flex flex-wrap items-center gap-1">
                    {path.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-1">
                        {i < path.length - 1 ? (
                          <>
                            <button type="button" className={`text-blue-700 underline rounded ${FOCUS_RING}`} onClick={() => go(path.slice(0, i + 1))}>
                              {p.name}
                            </button>
                            <ChevronRight className="w-3 h-3" aria-hidden="true" />
                          </>
                        ) : (
                          <b aria-current="page">{p.name}</b>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
                <div ref={listRef} tabIndex={-1} aria-label={`Contents of ${here.name}`} role="group" className="rounded-xl border-2 border-gray-200 overflow-hidden text-[13px] max-h-[340px] overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0033a0]">
                  {items.length === 0 && <p className="px-3 py-3 text-gray-600">{query ? 'Nothing here matches your search.' : 'This folder is empty.'}</p>}
                  {items.map((it) => {
                    const canPick = selectable(it)
                    return (
                      <div key={it.id} className={`flex items-start gap-2.5 px-3 py-2 border-t border-gray-100 first:border-t-0 ${canPick ? 'hover:bg-blue-50' : ''}`}>
                        <label className={`flex items-start gap-2.5 flex-1 min-w-0 ${canPick ? 'cursor-pointer' : 'cursor-default'}`}>
                          {single ? (
                            <input type="radio" name="pick-one" disabled={!canPick} checked={one?.id === it.id} onChange={() => setOne(it)} className="flex-shrink-0 w-4 h-4 mt-[2px] accent-[#0033a0]" />
                          ) : (
                            <input type="checkbox" checked={ticked.has(it.id)} onChange={() => toggle(it.id)} className="flex-shrink-0 w-4 h-4 mt-[2px] accent-[#0033a0]" />
                          )}
                          <KindIcon kind={it.kind} />
                          <span className={`flex-1 min-w-0 [overflow-wrap:anywhere] ${it.kind === 'folder' ? 'font-bold' : ''} ${canPick ? '' : 'text-gray-600'}`}>
                            {it.name}
                            <span className="sr-only">, {KIND_LABEL[it.kind]}</span>
                          </span>
                        </label>
                        <span className="flex-shrink-0 text-[11px] text-gray-600 mt-0.5 whitespace-nowrap" aria-hidden="true">{KIND_LABEL[it.kind]}</span>
                        {it.kind === 'folder' ? (
                          <button type="button" onClick={() => go([...path, it])} className={`flex-shrink-0 mt-0.5 text-[11px] font-black text-blue-700 underline flex items-center rounded ${FOCUS_RING}`}>
                            Look inside<span className="sr-only"> {it.name}</span>
                            <ChevronRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        ) : (
                          <OpenLink url={url(it)} label={it.name} className="flex-shrink-0 mt-0.5 text-[11px]" />
                        )}
                      </div>
                    )
                  })}
                </div>
                {!single && (
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} className="w-4 h-4 accent-[#0033a0]" />
                    <b>Include subfolders</b> <span className="text-gray-600">of ticked folders</span>
                  </label>
                )}
                {!single && nonDocs > 0 && (
                  <p className="text-xs text-gray-700">Sheets, Slides and Forms are added when they have a Blueprint Tools script. In this test build only the example blueprints and quizzes are added.</p>
                )}
              </>
            ) : (
              <p className="rounded-xl border-2 border-gray-200 px-3 py-4 text-[13px] text-gray-600">Test build: the example Drive only has files in My Drive.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-700 tabular-nums [overflow-wrap:anywhere] min-w-0 flex-1">{countText}</span>
            <button type="button" onClick={onClose} className={`text-xs font-bold text-gray-700 border border-gray-500 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 ${FOCUS_RING}`}>
              Cancel
            </button>
            {single ? (
              <ActionButton enabled={!!one} onClick={() => one && onPickOne(one.name)} variant="primary" why="choose one first" className="px-4 py-2">
                Use this
              </ActionButton>
            ) : nFolders > 0 ? (
              <ActionButton enabled onClick={goStep2} variant="primary" className="px-4 py-2">
                Next: check folders
              </ActionButton>
            ) : (
              <ActionButton enabled={!!ticked.size} onClick={() => onAddDocuments(finalDocIds())} variant="primary" why="tick at least one file" className="px-4 py-2">
                Add {finalCount || ''} to the list
              </ActionButton>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="px-4 pt-3">
            <h3 ref={step2Ref} tabIndex={-1} className="font-black text-[15px] focus:outline-none">What's inside the folders</h3>
            <p className="text-[13px] text-gray-600 mt-1">Ticked: files whose names look like a blueprint or a quiz. Untick anything you don't want.</p>
          </div>
          <div className="p-3">
            <div className="rounded-xl border-2 border-gray-200 overflow-hidden text-[13px] max-h-[380px] overflow-y-auto">
              {folderGroups.map(({ f, files }) => (
                <div key={f.id} role="group" aria-labelledby={`grp-${f.id}`}>
                  <h4 id={`grp-${f.id}`} className="sticky top-0 bg-[#dbe7fb] text-[#0a2a6b] text-[12px] font-black uppercase tracking-wider px-3 py-1.5">
                    {f.name} <span className="ml-2 font-normal normal-case tracking-normal">{files.length} file{files.length === 1 ? '' : 's'} found</span>
                  </h4>
                  {files.map((it) => {
                    const t = docType(it)
                    return (
                      <div key={it.id} className="flex items-start gap-2.5 px-3 py-2 border-t border-gray-100">
                        <label className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step2.has(it.id)}
                            onChange={() => {
                              const n = new Set(step2)
                              if (n.has(it.id)) n.delete(it.id)
                              else n.add(it.id)
                              setStep2(n)
                            }}
                            className="flex-shrink-0 w-4 h-4 mt-[2px] accent-[#0033a0]"
                          />
                          <KindIcon kind={it.kind} />
                          <span className="flex-1 min-w-0 [overflow-wrap:anywhere]">{it.name}</span>
                        </label>
                        {t ? <Pill className={`flex-shrink-0 mt-px ${t === 'Quiz' ? 'bg-purple-100 text-purple-900' : 'bg-gray-100 text-gray-800'}`}>{t}</Pill> : <span className="flex-shrink-0 mt-0.5 text-[11px] text-gray-600">Other</span>}
                        <OpenLink url={url(it)} label={it.name} className="flex-shrink-0 mt-0.5 text-[11px]" />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">Test build: only the example blueprints and quizzes are added to the list.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
            <button type="button" onClick={() => { moved.current = true; setStep(1) }} className={`text-xs font-bold text-gray-700 border border-gray-500 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 ${FOCUS_RING}`}>
              Back
            </button>
            <span className="text-xs text-gray-700 tabular-nums">{finalCount} ticked</span>
            <ActionButton enabled={finalCount > 0} onClick={() => onAddDocuments(finalDocIds())} variant="primary" why="tick at least one file" className="ml-auto px-4 py-2">
              Add {finalCount} to the list
            </ActionButton>
          </div>
        </>
      )}
    </Modal>
  )
}
