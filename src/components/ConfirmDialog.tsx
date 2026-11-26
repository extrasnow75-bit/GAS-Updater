/** "Update N documents?", built from the choices made in the documents list. */
import React, { useState } from 'react'
import { Upload, X, AlertTriangle, FlaskConical } from 'lucide-react'
import { Modal } from './Modal'
import { ActionButton, FOCUS_RING } from './ui'
import { REPO_KEYS, REPO_NAME, keptTools, type DocChoice, type Repos } from '../logic/compare'
import type { ListDoc, UpdateOutcome } from '../logic/run'

export function ConfirmDialog({
  docs,
  outcomes,
  choiceOf,
  repos,
  practice,
  onPractice,
  onCancel,
  onStart,
  onGoTo,
}: {
  docs: ListDoc[]
  outcomes: Map<string, UpdateOutcome>
  choiceOf(id: string): DocChoice
  repos: Repos
  practice: boolean
  onPractice(v: boolean): void
  onCancel(): void
  onStart(): void
  /** Close the dialog and take the person to a document's choices. */
  onGoTo(id: string): void
}) {
  const [understood, setUnderstood] = useState(false)
  const ready = docs.filter((d) => outcomes.get(d.id)?.result === 'done').length
  const real = !practice
  const canStart = ready > 0 && (practice || understood)

  return (
    <Modal labelledBy="confirm-title" onClose={onCancel}>
      <div className={`flex items-center gap-2 px-4 py-3 text-white ${real ? 'bg-red-700' : 'bg-[#0033a0]'}`}>
        {real ? <Upload className="w-4 h-4" aria-hidden="true" /> : <FlaskConical className="w-4 h-4" aria-hidden="true" />}
        <h2 id="confirm-title" className="font-black text-[15px]">
          {real ? `Update ${ready} document${ready === 1 ? '' : 's'} for real?` : `Practice run: ${ready} document${ready === 1 ? '' : 's'}`}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="ml-auto rounded p-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3 text-[13px]">
        <p className="text-gray-700">
          {real
            ? 'The scripts in these documents will be replaced with the tools you chose. Each document is backed up to the backup folder first. Document text is never changed.'
            : 'A practice run goes through every step but changes nothing, so you can see exactly what an update would do.'}
        </p>
        <ul className="rounded-xl border-2 border-gray-200 overflow-hidden">
          {docs.map((d) => {
            const o = outcomes.get(d.id)!
            const lines: React.ReactNode[] = []
            if (o.result === 'done' && d.files) {
              for (const r of REPO_KEYS) {
                const tools = [...new Set(o.rows.filter((x) => x.src === r && x.res !== 'unchanged' && x.res !== 'removed').map((x) => x.t.n))]
                if (tools.length) lines.push(<><b>From the {REPO_NAME[r]}:</b> {tools.join(', ')}</>)
              }
              const removed = o.rows.filter((x) => x.res === 'removed').map((x) => x.f)
              if (removed.length) lines.push(<><b>Removed:</b> {removed.join(', ')} (kept in the backup)</>)
              const kept = keptTools(d.files, repos, choiceOf(d.id)).map((t) => (t.other ? t.f.join(', ') : t.n))
              if (kept.length) lines.push(<><b>Kept as is:</b> {kept.join(', ')}</>)
            }
            const permChange = o.rows.some((r) => r.f === 'appsscript.json' && r.res === 'updated')
            const label =
              o.result === 'blocked'
                ? ['Needs a choice', 'bg-amber-100 text-amber-900']
                : o.result === 'nochange'
                  ? ['Nothing to change', 'bg-gray-100 text-gray-800']
                  : o.result === 'skipped'
                    ? ['Skipped', 'bg-gray-100 text-gray-800']
                    : o.result === 'error'
                      ? ['Will fail', 'bg-red-100 text-red-800']
                      : null
            return (
              <li key={d.id} className={`px-3 py-2.5 border-t border-gray-100 first:border-t-0 ${o.result !== 'done' ? 'bg-gray-50' : ''}`}>
                <p className="font-black [overflow-wrap:anywhere]">
                  {d.name} {label && <span className={`ml-1 text-[11px] font-black rounded-full px-2 py-0.5 align-middle ${label[1]}`}>{label[0]}</span>}
                </p>
                <div className="text-xs text-gray-700 mt-0.5 space-y-0.5">
                  {lines.map((l, i) => <p key={i}>{l}</p>)}
                  {o.result === 'blocked' && (
                    <p>
                      Skipped until you choose: {o.message}{' '}
                      <button type="button" onClick={() => onGoTo(d.id)} className={`font-bold text-blue-700 underline rounded ${FOCUS_RING}`}>
                        Go to {d.name}
                      </button>
                    </p>
                  )}
                  {o.result === 'skipped' && <p>{o.message}</p>}
                  {o.result === 'nochange' && <p>The choices made leave this document as it is.</p>}
                  {o.result === 'error' && <p>You can view this document but not edit it.</p>}
                </div>
                {permChange && (
                  <p className="mt-1.5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[12.5px] text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    Permissions change. People who open this blueprint will be asked by Google to allow the new access the next time they use the Blueprint Tools menu.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={practice} onChange={(e) => onPractice(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#0033a0]" />
          <span>
            <b>Practice run</b>{' '}
            <span className="text-gray-600">{practice ? '(on): nothing will change. Untick to update for real.' : '(off): the scripts will really be replaced.'}</span>
          </span>
        </label>
        {real && (
          <label className="flex items-start gap-2 cursor-pointer rounded-lg bg-red-50 border border-red-200 p-2 text-red-900">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="w-4 h-4 mt-0.5 accent-red-700" />
            <span>I understand this replaces the scripts in {ready === 1 ? 'this document' : `these ${ready} documents`}. (Test build: only the example data changes.)</span>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
        <button type="button" onClick={onCancel} className={`ml-auto text-xs font-bold text-gray-700 border border-gray-500 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 ${FOCUS_RING}`}>
          Cancel
        </button>
        <ActionButton
          enabled={canStart}
          onClick={onStart}
          variant={real ? 'danger' : 'primary'}
          why={!ready ? 'nothing to update' : 'tick “I understand” first'}
          className="px-4 py-2"
        >
          {practice ? 'Start practice run' : 'Update for real'} ({ready} document{ready === 1 ? '' : 's'})
        </ActionButton>
      </div>
    </Modal>
  )
}
