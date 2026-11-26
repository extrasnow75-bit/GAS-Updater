/** "Update N documents?" built from the choices made on the Check screen. */
import React, { useEffect, useRef, useState } from 'react'
import { Upload, X, AlertTriangle } from 'lucide-react'
import { REPO_NAME, choiceFor, cmpState, has, toolsFor, type RepoKey, type Repos } from '../logic/compare'
import type { ListDoc, UpdateOutcome } from '../logic/run'
import type { DocChoice } from '../logic/compare'

export function ConfirmDialog({
  docs,
  outcomes,
  choices,
  repos,
  practice,
  onPractice,
  onCancel,
  onStart,
}: {
  docs: ListDoc[]
  outcomes: UpdateOutcome[]
  choices: Record<string, DocChoice>
  repos: Repos
  practice: boolean
  onPractice(v: boolean): void
  onCancel(): void
  onStart(): void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [understood, setUnderstood] = useState(false)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  const ready = outcomes.filter((o) => o.result === 'done').length

  return (
    <div className="fixed inset-0 z-40 bg-gray-900/40 flex items-start justify-center p-3 sm:p-6 overflow-auto" role="presentation">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden focus:outline-none">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0033a0] text-white">
          <Upload className="w-4 h-4" aria-hidden="true" />
          <h2 id="confirm-title" className="font-black text-[15px]">
            Update {ready} document{ready === 1 ? '' : 's'}?
          </h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="ml-auto rounded p-0.5 hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p className="text-gray-700">Each document gets the tools you chose on the Check screen. Every document is backed up to the backup folder first. Document text is never changed.</p>
          <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
            {docs.map((d) => {
              const o = outcomes.find((x) => x.id === d.id)!
              const lines: React.ReactNode[] = []
              if (o.result === 'done' && d.files) {
                const c = choices[d.id]
                for (const r of ['main', 'exp'] as RepoKey[]) {
                  const tools = [...new Set(o.rows.filter((x) => x.src === r && x.res !== 'unchanged' && x.res !== 'removed').map((x) => x.t.n))]
                  if (tools.length) lines.push(<><b>From {REPO_NAME[r]}:</b> {tools.join(', ')}</>)
                }
                const removed = o.rows.filter((x) => x.res === 'removed').map((x) => x.f)
                if (removed.length) lines.push(<><b>Removed:</b> {removed.join(', ')} (kept in the backup)</>)
                const kept = toolsFor(d.files)
                  .filter((t) => choiceFor(d.files!, repos, c, t) === 'keep' && has(d.files!, t) && t.f.some((f) => (['main', 'exp'] as RepoKey[]).some((s) => ['differ', 'extra'].includes(cmpState(d.files!, repos[s], f)))))
                  .map((t) => (t.other ? t.f.join(', ') : t.n))
                if (kept.length) lines.push(<><b>Kept as is:</b> {kept.join(', ')}</>)
              }
              const permChange = o.rows.some((r) => r.f === 'appsscript.json' && r.res === 'updated')
              const label =
                o.result === 'blocked' ? ['Needs a choice', 'bg-amber-100 text-amber-900'] : o.result === 'nochange' ? ['Nothing to change', 'bg-gray-100 text-gray-800'] : o.result === 'skipped' ? ['Skipped', 'bg-gray-100 text-gray-800'] : o.result === 'error' ? ['Will fail', 'bg-red-100 text-red-800'] : null
              return (
                <div key={d.id} className={`px-3 py-2.5 border-t border-gray-100 first:border-t-0 ${o.result !== 'done' ? 'bg-gray-50' : ''}`}>
                  <p className="font-black [overflow-wrap:anywhere]">
                    {d.name} {label && <span className={`ml-1 text-[11px] font-black rounded-full px-2 py-0.5 align-middle ${label[1]}`}>{label[0]}</span>}
                  </p>
                  <div className="text-xs text-gray-700 mt-0.5 space-y-0.5">
                    {lines.map((l, i) => <p key={i}>{l}</p>)}
                    {o.result === 'blocked' && <p>Skipped: {o.message} Fix it on the Check screen.</p>}
                    {o.result === 'skipped' && <p>{o.message}</p>}
                    {o.result === 'error' && <p>You can view this document but not edit it.</p>}
                  </div>
                  {permChange && (
                    <p className="mt-1.5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[12.5px] text-amber-900">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      Permissions change. People who open this blueprint will be asked by Google to allow the new access the next time they use the Blueprint Tools menu.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={practice} onChange={(e) => onPractice(e.target.checked)} className="w-3.5 h-3.5 mt-0.5 accent-[#0033a0]" />
            <span>
              <b>Practice run</b> <span className="text-gray-600">: nothing will change. Untick to update for real.</span>
            </span>
          </label>
          {!practice && (
            <label className="flex items-start gap-2 cursor-pointer rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-900">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="w-3.5 h-3.5 mt-0.5 accent-[#0033a0]" />
              <span>I understand this replaces the scripts in these documents. (Test build: only the example data on this screen changes.)</span>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onCancel} className="ml-auto text-xs font-bold text-gray-700 border border-gray-300 rounded-lg px-3 py-2 bg-white hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || (!practice && !understood)}
            onClick={onStart}
            className={`text-sm font-black rounded-xl px-4 py-2 ${ready && (practice || understood) ? 'text-white bg-[#0033a0] hover:bg-[#002d8f]' : 'bg-gray-200 text-gray-600'}`}
          >
            {practice ? 'Start practice run' : 'Update for real'} ({ready} document{ready === 1 ? '' : 's'})
          </button>
        </div>
      </div>
    </div>
  )
}
