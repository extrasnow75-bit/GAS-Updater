/**
 * Under each checked blueprint: the "Update from" choice, any warnings, and the "Tools and
 * files" table with a Keep / Main Repo / Experimental Repo choice per tool.
 *
 * Everything shown is worked out once per change (`analyse`, memoised), and the component is
 * memoised, so the running timeline does not make every table recalculate.
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronDown } from 'lucide-react'
import { FOCUS_RING, Segmented } from './ui'
import {
  REPO_KEYS,
  REPO_NAME,
  analyse,
  cmpState,
  has,
  normalise,
  shortStamp,
  type Choice,
  type DocChoice,
  type FileSet,
  type RepoKey,
  type Repos,
} from '../logic/compare'

function Tag({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'blue' }) {
  const cls = tone === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-[#0a2a6b]'
  return <span className={`inline-block mt-0.5 whitespace-nowrap text-[10.5px] font-black rounded-full px-1.5 py-px ${cls}`}>{children}</span>
}

function SourceCell({ doc, src, f, name }: { doc: FileSet; src: FileSet; f: string; name: string }) {
  const k = cmpState(doc, src, f)
  const d = doc[f]
  const g = src[f]
  if (k === 'same')
    return (
      <span className="text-green-700 font-bold inline-flex items-center gap-1">
        <Check className="w-3 h-3" aria-hidden="true" />
        Same
      </span>
    )
  if (k === 'extra' || k === 'na') return <span className="text-gray-600 italic">Not in {name}</span>
  const tag =
    k === 'missing' ? (
      <Tag tone="amber">Not in document</Tag>
    ) : g.s === d.s ? (
      <Tag tone="amber">Same date, different content</Tag>
    ) : g.s > d.s ? (
      <Tag tone="amber">Newer in GitHub</Tag>
    ) : (
      <Tag tone="blue">Document is newer</Tag>
    )
  return (
    <>
      <span className="block whitespace-nowrap">{shortStamp(g.s)}</span>
      {tag}
    </>
  )
}

export const ToolTable = memo(function ToolTable({
  docId,
  docName,
  doc,
  repos,
  compared,
  choice,
  open,
  onToggle,
  onChoice,
  announce,
}: {
  docId: string
  docName: string
  doc: FileSet
  repos: Repos
  compared: RepoKey[]
  choice: DocChoice
  open: boolean
  onToggle(id: string): void
  onChoice(id: string, c: DocChoice): void
  announce(text: string): void
}) {
  const [all, setAll] = useState(false)
  const [confirmReset, setConfirmReset] = useState<RepoKey | null>(null)
  const a = useMemo(() => analyse(doc, repos, choice), [doc, repos, choice])
  const mixed = a.lit === 'mixed'
  const setTool = (k: string, c: Choice) => onChoice(docId, normalise(doc, repos, { doc: choice.doc, t: { ...choice.t, [k]: c } }))

  // Tell screen-reader users when a choice creates (or clears) a problem.
  const lastWarnings = useRef(a.warnings.length)
  useEffect(() => {
    if (a.warnings.length > lastWarnings.current) announce(`${docName}: ${a.warnings[0].msg} This document will be skipped until you choose.`)
    else if (a.warnings.length === 0 && lastWarnings.current > 0) announce(`${docName}: problem fixed.`)
    lastWarnings.current = a.warnings.length
  }, [a.warnings, docName, announce])

  const shownTools = all ? a.tools : a.differing

  return (
    <div className="mt-2 pl-6" data-doc-table={docId}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-gray-800">Update from:</span>
        <Segmented<RepoKey>
          name={`doc-${docId}`}
          label={`${docName}: update from`}
          faded={mixed}
          value={a.lit === 'mixed' ? null : a.lit}
          onChange={(v) => (mixed ? setConfirmReset(v) : onChoice(docId, { doc: v, t: {} }))}
          options={REPO_KEYS.map((r) => ({ value: r, label: REPO_NAME[r] }))}
        />
        <span className="text-gray-700">
          {mixed && <><b>Mixed</b> (chosen tool by tool) · </>}
          {a.summary}
        </span>
      </div>

      {confirmReset && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 p-2 text-[12px]">
          <span>Set every tool to the {REPO_NAME[confirmReset]}? This replaces your tool-by-tool choices.</span>
          <button type="button" className={`rounded-lg bg-[#0033a0] text-white font-black px-2.5 py-1 ${FOCUS_RING}`} onClick={() => { onChoice(docId, { doc: confirmReset, t: {} }); setConfirmReset(null) }}>
            Yes, reset
          </button>
          <button type="button" className={`rounded-lg border-2 border-gray-500 font-bold px-2.5 py-0.5 bg-white ${FOCUS_RING}`} onClick={() => setConfirmReset(null)}>
            Cancel
          </button>
        </div>
      )}

      {a.warnings.map((w) => (
        <div key={w.id} className="mt-1.5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-[12.5px] text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p>{w.msg} Choose one:</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {w.fixes.map((fx) => (
                <button key={fx.label} type="button" onClick={() => setTool(fx.k, fx.c)} className={`rounded-lg border-2 border-amber-700 bg-white text-amber-900 font-bold px-2.5 py-1 hover:bg-amber-100 ${FOCUS_RING}`}>
                  {fx.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11.5px]">Until you choose, this document will be skipped.</p>
          </div>
        </div>
      ))}

      <div className="mt-1.5 text-xs text-gray-700 space-y-0.5">
        {compared.map((r) => (
          <p key={r}>
            {REPO_NAME[r]}: <b className={a.counts[r].length ? 'text-amber-800' : 'text-green-700'}>{a.counts[r].length ? 'Out of date' : 'Matches exactly'}</b>
            {a.counts[r].length ? ` (${a.counts[r].join(', ')})` : ''}
          </p>
        ))}
      </div>
      <button type="button" aria-expanded={open} onClick={() => onToggle(docId)} className={`mt-1 inline-flex items-center gap-1 rounded font-bold text-xs text-[#0033a0] hover:underline ${FOCUS_RING}`}>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
        Tools and files<span className="sr-only"> for {docName}</span>
      </button>

      {open && (
        <div className="mt-2 -ml-6 rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
            <span className="text-gray-700">{all ? `Showing all ${a.tools.length} tools` : `Showing the ${a.differing.length} tools that differ (of ${a.tools.length})`}</span>
            <button type="button" onClick={() => setAll(!all)} className={`ml-auto font-bold text-blue-700 underline underline-offset-2 rounded ${FOCUS_RING}`}>
              {all ? 'Show only tools that differ' : 'Show all tools'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <caption className="sr-only">Tools and files in {docName}, compared with the GitHub repos</caption>
              <thead>
                <tr>
                  {['File', 'In document', 'Main Repo', 'Experimental Repo'].map((h) => (
                    <th key={h} scope="col" className="bg-[#dbe7fb] text-[#0a2a6b] font-black text-left align-bottom px-2 py-1.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              {shownTools.map((t) => {
                const c = a.choices[t.k]
                const inDoc = has(doc, t)
                return (
                  <tbody key={t.k}>
                    <tr>
                      <th scope="rowgroup" colSpan={4} className="text-left font-normal px-2 pt-2.5 pb-1 border-t-2 border-gray-200 bg-white">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="flex-1 min-w-[12rem]">
                            <b className="text-[12.5px]">{t.n}</b>
                            {t.sub && <span className="block text-[11.5px] text-gray-600">{t.sub}</span>}
                            {t.k === 'perm' && a.permDiff && <span className="block text-[11.5px] text-gray-700 mt-0.5">{a.permDiff}</span>}
                          </span>
                          <Segmented<Choice>
                            name={`tool-${docId}-${t.k}`}
                            label={`${t.n}: update from`}
                            value={c}
                            onChange={(v) => setTool(t.k, v)}
                            options={
                              t.other
                                ? [{ value: 'keep', label: 'Keep' }, { value: 'remove', label: 'Remove' }]
                                : [
                                    { value: 'keep', label: inDoc ? 'Keep' : 'Don’t add' },
                                    ...REPO_KEYS.map((r) => ({ value: r as Choice, label: REPO_NAME[r], disabled: !has(repos[r], t), reason: `not in the ${REPO_NAME[r]}` })),
                                  ]
                            }
                          />
                        </div>
                      </th>
                    </tr>
                    {t.f.map((f) => (
                      <tr key={f}>
                        <th scope="row" className="text-left font-normal pl-4 pr-2 py-1 font-mono text-[11.5px] whitespace-nowrap text-gray-800">{f}</th>
                        <td className="px-2 py-1 whitespace-nowrap align-top">
                          {doc[f] ? shortStamp(doc[f].s) || <span className="italic text-gray-600">no date stamp</span> : <span className="italic text-gray-600">Not in document</span>}
                        </td>
                        {REPO_KEYS.map((r) => (
                          <td key={r} className="px-2 py-1 align-top">
                            <SourceCell doc={doc} src={repos[r]} f={f} name={REPO_NAME[r]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                )
              })}
            </table>
          </div>
          <p className="px-3 py-2 border-t border-gray-200 text-[11.5px] text-gray-600">
            Each tool’s two files always move together. Dates are the “Last updated” line at the top of each file, in Mountain Time. Whether a file differs is decided by its content, so a file edited without changing its date still shows up (“Same date, different content”).
          </p>
        </div>
      )}
    </div>
  )
})
