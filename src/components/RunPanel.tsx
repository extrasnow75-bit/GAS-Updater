/**
 * Summary card and timeline, copied from the Rubric Creator app's Analyze & Deploy screen:
 * successes and failures, a progress bar, "What went wrong" grouped by cause, then the dark
 * timeline with Copy Logs and Clear.
 */
import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { EXPORT_HEADERS, type Line } from '../logic/run'

export interface RunSummary {
  ok: string
  bad?: string
  done: boolean
  progress: number
  elapsed: string
  wrong: { cause: string; fix: string; docs: string[] }[]
  exportRows?: string[][]
  practice?: boolean
}

const COLOUR = { success: 'text-green-400', error: 'text-red-400', warning: 'text-amber-400', info: 'text-gray-300' }

export function RunPanel({ title, summary, lines, onClear }: { title: string; summary: RunSummary; lines: Line[]; onClear(): void }) {
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  // Braces matter: newer Chromium returns a promise from scrollIntoView, and React would
  // try to call whatever an effect returns as its clean-up function.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [lines.length])

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNote(`${what} copied. Paste into any Google Sheet or Doc.`)
    } catch {
      setNote(`${what} could not be copied. Try again with the app window active.`)
    }
  }
  const rows = summary.exportRows ?? []
  const tsv = [EXPORT_HEADERS, ...rows].map((r) => r.join('\t')).join('\n')

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {summary.done ? <CheckCircle2 className="w-6 h-6 text-green-500" aria-hidden="true" /> : <Loader2 className="w-6 h-6 text-[#0033a0] animate-spin" aria-hidden="true" />}
            <span className="font-black text-gray-900">{summary.ok}</span>
          </div>
          {summary.bad && (
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
              <span className="font-bold text-red-700">{summary.bad}</span>
            </div>
          )}
        </div>
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(summary.progress * 100)} aria-label={`${title} progress`}>
          <div className={`h-full rounded-full transition-all ${summary.bad ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${summary.progress * 100}%` }} />
        </div>
        <div className="mt-2 text-xs text-gray-600">{summary.elapsed}</div>

        {summary.done && summary.wrong.length > 0 && (
          <div className="mt-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="font-black text-sm text-amber-900 uppercase tracking-wide">What went wrong</p>
            {summary.wrong.map((w) => (
              <div key={w.cause} className="space-y-1">
                <p className="text-sm font-bold text-gray-900">{w.cause}</p>
                <p className="text-sm text-gray-700">{w.fix}</p>
                <p className="text-xs text-gray-600">{w.docs.join(', ')}</p>
              </div>
            ))}
          </div>
        )}

        {summary.done && summary.exportRows && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy(tsv, 'Results')} className="flex-1 min-w-[10rem] inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-[#0033a0] text-[#0033a0] font-black text-sm hover:bg-blue-50">
              Copy results
            </button>
            <button type="button" onClick={() => { setPreview(true); setNote('Test build: nothing was exported. The table below shows what would go into a new tab of the update history sheet.') }} className="flex-1 min-w-[10rem] inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0033a0] text-white font-black text-sm hover:bg-[#002d8f]">
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              Export to Google Sheet
            </button>
            <p className="w-full text-xs text-gray-600">Export adds a tab to your update history sheet. Copy results pastes as a table into any Sheet or Doc.</p>
          </div>
        )}
        <p role="status" className="text-xs text-[#0a2a6b] mt-2 empty:hidden">{note}</p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-lg">
        <div className="bg-[#1a1a2e] px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{title} Timeline</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void copy(lines.map((l) => `[${l.ts}] ${l.msg}`).join('\n'), 'Logs')} className="text-xs font-bold text-gray-300 hover:text-white">
              Copy Logs
            </button>
            <button type="button" onClick={onClear} className="text-xs font-bold text-gray-300 hover:text-white">
              Clear
            </button>
          </div>
        </div>
        <div className="bg-[#0d0d1a] p-4 h-72 overflow-y-auto font-mono text-xs space-y-1 select-text">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-400 flex-shrink-0">[{l.ts}]</span>
              <span className={`${COLOUR[l.kind]} whitespace-pre-wrap`}>{l.msg}</span>
            </div>
          ))}
          <div ref={end} />
        </div>
      </div>

      {preview && rows.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-600">Test build: what the exported sheet would contain</p>
          <p className="text-[13px] text-gray-700 mt-1 mb-2.5">One row per file per blueprint ({rows.length} rows for this run).</p>
          <div className="overflow-x-auto rounded-lg border border-gray-300">
            <table className="text-[11.5px] border-collapse min-w-[900px]">
              <thead>
                <tr>
                  {EXPORT_HEADERS.map((h) => (
                    <th key={h} className="bg-[#dbe7fb] text-[#0a2a6b] font-black text-left px-2 py-1.5 border-b border-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={`px-2 py-1 border-t border-gray-200 whitespace-nowrap ${j === 7 ? (c.startsWith('Failed') ? 'text-red-700 font-bold' : c === 'Unchanged' ? 'text-gray-600' : 'text-green-800 font-bold') : ''}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
