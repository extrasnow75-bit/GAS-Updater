/**
 * Under each checked blueprint: the "Update from" choice, any warnings, and the
 * "Tools and files" table with a Keep / Main Repo / Experimental Repo choice per tool.
 */
import React, { useState } from 'react'
import { AlertTriangle, Check, ChevronDown } from 'lucide-react'
import { Segmented } from './ui'
import {
  REPO_NAME,
  cmpCounts,
  cmpState,
  choiceFor,
  has,
  normalise,
  permDiff,
  shortStamp,
  shownDoc,
  summary,
  toolDiffers,
  toolsFor,
  warnings,
  type Choice,
  type DocChoice,
  type FileSet,
  type RepoKey,
  type Repos,
} from '../logic/compare'

function Tag({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'red' | 'blue' }) {
  const cls = tone === 'amber' ? 'bg-amber-100 text-amber-900' : tone === 'red' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-[#0a2a6b]'
  return <span className={`inline-block mt-0.5 mr-1 whitespace-nowrap text-[10.5px] font-black rounded-full px-1.5 py-px ${cls}`}>{children}</span>
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
  if (k === 'extra' || k === 'na') return <span className="text-gray-500 italic">Not in {name}</span>
  const gs = shortStamp(g.s)
  const tag = k === 'missing' ? <Tag tone="amber">Missing</Tag> : g.s === d.s ? <Tag tone="red">Same date, different content</Tag> : g.s > d.s ? <Tag tone="amber">Newer in GitHub</Tag> : <Tag tone="blue">Document is newer</Tag>
  return (
    <>
      <span className="block">{gs}</span>
      {tag}
    </>
  )
}

export function ToolTable({
  docId,
  doc,
  repos,
  choice,
  onChoice,
  defaultOpen,
}: {
  docId: string
  doc: FileSet
  repos: Repos
  choice: DocChoice
  onChoice(c: DocChoice): void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [all, setAll] = useState(false)
  const tools = toolsFor(doc)
  const lit = shownDoc(doc, repos, choice)
  const mixed = lit === 'mixed'
  const W = warnings(doc, repos, choice)
  const nDiff = tools.filter((t) => toolDiffers(doc, repos, t)).length
  const setTool = (k: string, c: Choice) => onChoice(normalise(doc, repos, { doc: choice.doc, t: { ...choice.t, [k]: c } }))

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-gray-800" id={`uf-${docId}`}>Update from:</span>
        <Segmented<RepoKey>
          name={`doc-${docId}`}
          label="Update from"
          faded={mixed}
          value={mixed ? null : lit}
          onChange={(v) => onChoice({ doc: v, t: {} })}
          options={(['main', 'exp'] as RepoKey[]).map((r) => ({ value: r, label: REPO_NAME[r], title: mixed ? `Set every tool back to the ${REPO_NAME[r]}` : undefined }))}
        />
        <span className="text-gray-700">
          {mixed && <><b>Mixed</b> (set tool by tool below) · </>}
          {summary(doc, repos, choice)}
        </span>
      </div>

      {W.map((w) => (
        <div key={w.id} className="mt-1.5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[12px] text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            {w.msg}
            <span className="flex flex-wrap gap-x-3 mt-1">
              {w.fixes.map((fx) => (
                <button key={fx.label} type="button" className="font-bold underline underline-offset-2" onClick={() => setTool(fx.k, fx.c)}>
                  {fx.label}
                </button>
              ))}
            </span>
            <span className="block mt-0.5 text-[11.5px]">This document is skipped until this is fixed.</span>
          </span>
        </div>
      ))}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-700">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded font-bold text-[#0033a0] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0033a0]">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
          Tools and files
        </button>
        {(['main', 'exp'] as RepoKey[]).map((r) => {
          const p = cmpCounts(doc, repos[r])
          return (
            <span key={r}>
              {REPO_NAME[r]}: <b className={p.length ? 'text-amber-800' : 'text-green-700'}>{p.length ? 'Out of date' : 'Matches exactly'}</b>
              {p.length ? ` (${p.join(', ')})` : ''}
            </span>
          )
        })}
      </div>

      {open && (
        <div className="mt-2 rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
            <span className="text-gray-700">{all ? `Showing all ${tools.length} tools` : `Showing the ${nDiff} tools that differ (of ${tools.length})`}</span>
            <button type="button" onClick={() => setAll(!all)} className="ml-auto font-bold text-blue-700 underline underline-offset-2">
              {all ? 'Show only tools that differ' : 'Show all tools'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {['File', 'In this document', 'Main Repo (GitHub)', 'Experimental Repo (GitHub)'].map((h) => (
                    <th key={h} scope="col" className="bg-[#dbe7fb] text-[#0a2a6b] font-black text-left align-bottom px-2 py-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              {tools
                .filter((t) => all || toolDiffers(doc, repos, t))
                .map((t) => {
                  const c = choiceFor(doc, repos, choice, t)
                  const inDoc = has(doc, t)
                  const pd = t.k === 'perm' ? permDiff(doc, repos) : ''
                  return (
                    <tbody key={t.k}>
                      <tr>
                        <td colSpan={4} className="px-2 pt-2.5 pb-1 border-t-2 border-gray-200 bg-white">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="flex-1 min-w-[12rem]">
                              <b className="text-[12.5px]">{t.n}</b>
                              {t.sub && <span className="block text-[11.5px] text-gray-600">{t.sub}</span>}
                              {pd && <span className="block text-[11.5px] text-gray-700 mt-0.5">{pd}</span>}
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
                                      { value: 'main', label: 'Main Repo', disabled: !has(repos.main, t), title: has(repos.main, t) ? undefined : 'Not in the Main Repo' },
                                      { value: 'exp', label: 'Experimental Repo', disabled: !has(repos.exp, t), title: has(repos.exp, t) ? undefined : 'Not in the Experimental Repo' },
                                    ]
                              }
                            />
                          </div>
                        </td>
                      </tr>
                      {t.f.map((f) => (
                        <tr key={f}>
                          <td className="pl-5 pr-2 py-1 font-mono text-[11.5px] whitespace-nowrap text-gray-800">{f}</td>
                          <td className="px-2 py-1">
                            {doc[f] ? shortStamp(doc[f].s) || <span className="italic text-gray-600">no date stamp</span> : <span className="italic text-gray-500">Not in this document</span>}
                          </td>
                          <td className="px-2 py-1">
                            <SourceCell doc={doc} src={repos.main} f={f} name="Main Repo" />
                          </td>
                          <td className="px-2 py-1">
                            <SourceCell doc={doc} src={repos.exp} f={f} name="Experimental Repo" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )
                })}
            </table>
          </div>
          <p className="px-3 py-2 border-t border-gray-200 text-[11.5px] text-gray-600">
            Each tool’s two files always move together. Dates are the “Last updated” line at the top of each file. Times are Mountain Time. Whether a file differs is decided by its content, so a file edited without changing its date still shows up.
          </p>
        </div>
      )}
    </div>
  )
}
