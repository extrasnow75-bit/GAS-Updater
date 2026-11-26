/**
 * Initial setup, in the Canvas Extractor Tools layout: a blue accordion header with status
 * dots and "N items incomplete", and bordered cards (green when done, amber when something
 * needs attention). TEST BUILD: nothing here is saved or checked with Google or GitHub.
 */
import React, { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, ChevronDown, KeyRound, Shield, Eye, EyeOff, CheckCircle2, Link2, FileText, FileSpreadsheet, Folder, GitBranch, Plus } from 'lucide-react'
import { ACCOUNTS, TOKEN_HELP_URL } from '../logic/exampleData'
import { FOCUS_RING, OpenLink } from './ui'

export interface SetupState {
  account: 'GS' | 'EX'
  signedIn: { GS: boolean; EX: boolean }
  token: string
  semesterList: string
  backupFolder: string
  history: string
  blueprintTemplate: string
  quizTemplate: string
}

export type SetupField = 'semesterList' | 'backupFolder' | 'history' | 'blueprintTemplate' | 'quizTemplate'

export const FIELD_INFO: Record<SetupField, { label: string; kind: 'sheet' | 'folder' | 'doc'; placeholder: string; required: boolean }> = {
  semesterList: { label: 'Multi-semester list (Google Sheet)', kind: 'sheet', placeholder: 'or paste: https://docs.google.com/spreadsheets/d/…', required: true },
  backupFolder: { label: 'Backup folder (Google Drive folder)', kind: 'folder', placeholder: 'or paste: https://drive.google.com/drive/folders/…', required: true },
  history: { label: 'Update history (Google Sheet)', kind: 'sheet', placeholder: 'or paste: https://docs.google.com/spreadsheets/d/…', required: false },
  blueprintTemplate: { label: 'Blueprint template (Google Doc)', kind: 'doc', placeholder: 'or paste: https://docs.google.com/document/d/…', required: true },
  quizTemplate: { label: 'Quiz questions template (Google Doc)', kind: 'doc', placeholder: 'or paste: https://docs.google.com/document/d/…', required: false },
}

const DOT_NAMES = ['Google accounts', 'GitHub token (optional)', 'Google files', 'Templates', 'GitHub repos']

export function setupRemaining(s: SetupState): string[] {
  const out: string[] = []
  if (!s.signedIn.GS && !s.signedIn.EX) out.push('Google account')
  if (!s.semesterList || !s.backupFolder) out.push('Google files')
  if (!s.blueprintTemplate) out.push('Templates')
  return out
}

function Required() {
  return (
    <>
      <span className="text-red-700" aria-hidden="true">*</span>
      <span className="sr-only">(required)</span>
    </>
  )
}

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const cardClass = (done: boolean, attention = false) =>
  `rounded-2xl border-2 p-4 ${done ? 'border-green-200 shadow-[0_0_0_3px_rgba(240,253,244,1)]' : attention ? 'border-amber-300' : 'border-gray-200'}`

function KindIcon({ kind }: { kind: 'sheet' | 'folder' | 'doc' }) {
  const cls = 'w-4 h-4'
  if (kind === 'sheet') return <FileSpreadsheet className={cls} aria-hidden="true" />
  if (kind === 'folder') return <Folder className={cls} aria-hidden="true" />
  return <FileText className={cls} aria-hidden="true" />
}

function FileField({ field, value, onChange, onChoose, help }: { field: SetupField; value: string; onChange(v: string): void; onChoose(): void; help?: string }) {
  const info = FIELD_INFO[field]
  const [draft, setDraft] = useState('')
  const id = `field-${field}`
  const labelId = `${id}-label`
  return (
    <div>
      <label id={labelId} htmlFor={id} className="text-[13px] font-bold block mb-1">
        {info.label}
        {!info.required && <span className="font-normal text-gray-600"> (optional)</span>}
      </label>
      <button
        type="button"
        onClick={onChoose}
        aria-describedby={labelId}
        className={`w-full mb-2 flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#0033a0] text-[#0033a0] hover:bg-blue-50 font-black text-sm px-4 py-2 ${FOCUS_RING}`}
      >
        <KindIcon kind={info.kind} />
        Choose from Drive
      </button>
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={info.placeholder}
          className="flex-1 min-w-0 border-2 border-gray-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          aria-disabled={!draft.trim()}
          aria-describedby={labelId}
          onClick={() => {
            if (!draft.trim()) return
            onChange(`Pasted address (test build: not checked)`)
            setDraft('')
          }}
          className={`flex-shrink-0 px-3 rounded-xl border-2 font-black text-sm ${FOCUS_RING} ${draft.trim() ? 'border-[#0033a0] text-[#0033a0] hover:bg-blue-50' : 'border-gray-400 text-gray-600 cursor-not-allowed'}`}
        >
          Check
        </button>
      </div>
      {value && (
        <p className="mt-1.5 flex items-center gap-2 text-sm font-black text-green-700">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
          <button type="button" onClick={() => onChange('')} aria-describedby={labelId} className={`ml-auto text-xs font-bold text-gray-700 underline rounded px-1 py-0.5 ${FOCUS_RING}`}>
            Clear
          </button>
        </p>
      )}
      {help && <p className="text-xs text-gray-600 mt-1.5">{help}</p>}
    </div>
  )
}

export function SetupPanel({
  state,
  onChange,
  onChooseFromDrive,
}: {
  state: SetupState
  onChange(next: SetupState): void
  onChooseFromDrive(field: SetupField): void
}) {
  const remaining = setupRemaining(state)
  const complete = remaining.length === 0
  const [open, setOpen] = useState(!complete)
  const [showToken, setShowToken] = useState(false)
  const [tokenDraft, setTokenDraft] = useState('')
  const wasComplete = useRef(complete)

  // Close by itself the moment setup becomes complete, as in Extractor Tools.
  useEffect(() => {
    if (complete && !wasComplete.current) setOpen(false)
    wasComplete.current = complete
  }, [complete])

  const set = (patch: Partial<SetupState>) => onChange({ ...state, ...patch })
  const dots = [
    state.signedIn.GS || state.signedIn.EX,
    !!state.token,
    !!state.semesterList && !!state.backupFolder,
    !!state.blueprintTemplate,
    true,
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="setup-panel"
          id="setup-toggle"
          onClick={() => setOpen(!open)}
          className="w-full bg-[#0033a0] hover:bg-[#002d8f] text-white px-4 py-3.5 flex items-center gap-3 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
          <span className="font-black text-[15px]">Initial setup</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5" aria-hidden="true" title={DOT_NAMES.map((n, i) => `${n}: ${dots[i] ? 'done' : 'not done'}`).join('\n')}>
              {dots.map((d, i) => (
                <span key={i} className={`w-2 h-2 rounded-full ${d ? 'bg-green-400' : 'bg-white/70'}`} />
              ))}
            </span>
            <span className="text-[11px] font-bold">
              {complete ? (state.token ? 'Complete' : 'Complete · GitHub token optional') : `${remaining.length} required item${remaining.length === 1 ? '' : 's'} incomplete`}
            </span>
            <ChevronDown className={`w-[18px] h-[18px] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </button>
      </h2>

      {open && (
        <div id="setup-panel" className="bg-white border border-gray-200 border-t-0 rounded-b-2xl p-3.5 space-y-3">
          <p className="text-[12px] text-gray-600">
            <span className="text-red-700" aria-hidden="true">*</span> Required
          </p>
          {/* Google accounts */}
          <div className={cardClass(state.signedIn.GS || state.signedIn.EX)}>
            <div className="flex items-center gap-2 mb-2">
              <GoogleIcon />
              <h3 className="font-black text-[15px]">
                Google accounts <Required />
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-2.5">
              This lets the app read and update the scripts in your Google documents. You can save two accounts, for example your Boise State account and a personal one.
            </p>
            <div className="space-y-2.5">
              {(['GS', 'EX'] as const).map((k) => {
                const a = ACCOUNTS[k]
                const inUse = state.account === k && state.signedIn[k]
                return (
                  <div key={k} className="flex items-center gap-3 flex-wrap">
                    <div className={`w-9 h-9 rounded-full ${k === 'GS' ? 'bg-[#0033a0]' : 'bg-gray-600'} text-white flex items-center justify-center font-black text-xs flex-shrink-0`}>{a.label}</div>
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-black text-sm truncate">
                        {a.name}
                        {inUse && <span className="ml-1 text-[11px] font-black rounded-full px-2 py-0.5 bg-blue-100 text-[#0a2a6b] align-middle">In use</span>}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{a.email}</p>
                    </div>
                    {state.signedIn[k] ? (
                      <>
                        {!inUse && (
                          <button type="button" onClick={() => set({ account: k })} className={`text-xs font-bold text-blue-700 underline rounded ${FOCUS_RING}`}>
                            Use this account
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const signedIn = { ...state.signedIn, [k]: false }
                            const other = k === 'GS' ? 'EX' : 'GS'
                            set({ signedIn, account: signedIn[other] ? other : state.account })
                          }}
                          className={`text-xs font-bold text-gray-700 border border-gray-500 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 ${FOCUS_RING}`}
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => set({ signedIn: { ...state.signedIn, [k]: true }, account: state.signedIn.GS || state.signedIn.EX ? state.account : k })}
                        className={`text-xs font-black text-white bg-[#0033a0] rounded-lg px-3 py-1.5 hover:bg-[#002d8f] ${FOCUS_RING}`}
                      >
                        Sign in with Google
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-2.5 text-[12.5px] text-gray-700">Documents you add are opened with the account in use. You can switch accounts here or from the account button at the top.</p>
            <p className="mt-1 text-[12.5px] text-gray-700">Test build: signing in and out only changes this screen. Nothing connects to Google.</p>
          </div>

          {/* GitHub token */}
          <div className={cardClass(!!state.token)}>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-red-600" aria-hidden="true" />
              <h3 className="font-black text-[15px]">GitHub token</h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-2.5">
              Only needed for private repos, such as the Experimental Repo (blueprint-tools-script-private). The Main Repo is public and needs no token.
            </p>
            {state.token ? (
              <div className="flex items-center gap-2 text-sm font-black text-green-700">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Token saved
                <button type="button" onClick={() => set({ token: '' })} className={`ml-auto text-xs font-bold text-gray-700 border border-gray-500 rounded-lg px-2.5 py-1.5 ${FOCUS_RING}`}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-2.5">
                  <input
                    type={showToken ? 'text' : 'password'}
                    aria-label="GitHub token"
                    placeholder="Paste your GitHub token"
                    value={tokenDraft}
                    onChange={(e) => setTokenDraft(e.target.value)}
                    className="w-full border-2 border-gray-500 rounded-xl px-3.5 py-2.5 pr-12 text-sm font-mono focus:outline-none focus:border-[#0033a0] focus:ring-2 focus:ring-blue-200"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)} aria-label={showToken ? 'Hide token' : 'Show token'} aria-pressed={showToken} className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 ${FOCUS_RING}`}>
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  aria-disabled={!tokenDraft.trim()}
                  onClick={() => {
                    if (!tokenDraft.trim()) return
                    set({ token: 'saved' })
                    setTokenDraft('')
                  }}
                  className={`block w-full py-2.5 rounded-xl text-sm font-black ${FOCUS_RING} ${tokenDraft.trim() ? 'bg-[#0033a0] text-white hover:bg-[#002d8f]' : 'bg-gray-200 text-gray-700 cursor-not-allowed'}`}
                >
                  Save token
                </button>
                <p className="text-xs text-gray-700 mt-2">
                  Use a <b>fine-grained, read-only</b> token for the Experimental Repo only, with an expiry date. It will be stored encrypted on this computer only.
                </p>
                <p className="mt-1.5 text-center">
                  <OpenLink url={TOKEN_HELP_URL} className="text-[12.5px]">How do I get a GitHub token?</OpenLink>
                </p>
                <p className="text-xs text-gray-600 mt-2">Test build: the token is not stored anywhere. Paste any text to try it.</p>
              </>
            )}
          </div>

          {/* Google files */}
          <div className={cardClass(!!state.semesterList && !!state.backupFolder, true)}>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-[#0033a0]" aria-hidden="true" />
              <h3 className="font-black text-[15px]">
                Google files <Required />
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-3">Where the app finds projects, keeps backups and records its update history. Choose each one from Drive, or paste its address.</p>
            <div className="space-y-4">
              {(['semesterList', 'backupFolder', 'history'] as const).map((f) => (
                <FileField
                  key={f}
                  field={f}
                  value={state[f]}
                  onChange={(v) => set({ [f]: v } as Partial<SetupState>)}
                  onChoose={() => onChooseFromDrive(f)}
                  help={
                    f === 'history'
                      ? 'A permanent record of every update: one row per document, added after each run, plus a tab for each “Export to Google Sheet”. Leave empty and the app makes a new “GAS Updater update history” sheet in the backup folder.'
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className={cardClass(!!state.blueprintTemplate, true)}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#0033a0]" aria-hidden="true" />
              <h3 className="font-black text-[15px]">
                Templates <Required />
              </h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-3">The templates new projects are copied from. Keeping their scripts up to date means new projects start with the latest version.</p>
            <div className="space-y-4">
              {(['blueprintTemplate', 'quizTemplate'] as const).map((f) => (
                <FileField key={f} field={f} value={state[f]} onChange={(v) => set({ [f]: v } as Partial<SetupState>)} onChoose={() => onChooseFromDrive(f)} />
              ))}
            </div>
          </div>

          {/* GitHub repos */}
          <div className={cardClass(true)}>
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-[#0033a0]" aria-hidden="true" />
              <h3 className="font-black text-[15px]">GitHub repos</h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-2.5">The GitHub repos the app copies scripts from. Each repo is for one kind of document, so a blueprint script never goes into a quiz.</p>
            <div className="rounded-xl border-2 border-gray-200 overflow-hidden text-[13px]">
              {[
                ['Main Repo', 'Blueprints', 'extrasnow75-bit/blueprint-tools-script', 'Public', 'bg-green-100 text-green-800'],
                ['Experimental Repo', 'Blueprints', 'extrasnow75-bit/blueprint-tools-script-private', state.token ? 'Token saved' : 'Needs token', state.token ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'],
              ].map(([n, kind, repo, badge, badgeCls]) => (
                <div key={n} className="flex items-center gap-2.5 px-3 py-2 border-t border-gray-100 first:border-t-0">
                  <span className="flex-1 min-w-0">
                    <b className="block">
                      {n} <span className="ml-1 text-[11px] font-black rounded-full px-2 py-0.5 bg-gray-100 text-gray-800 align-middle">{kind}</span>
                    </b>
                    <small className="text-xs text-gray-600 [overflow-wrap:anywhere]">{repo}</small>
                  </span>
                  <span className={`text-[11px] font-black rounded-full px-2 py-0.5 ${badgeCls}`}>{badge}</span>
                </div>
              ))}
              <div className="flex items-center gap-2.5 px-3 py-2 border-t border-gray-100 bg-gray-50">
                <span className="flex-1 min-w-0">
                  <b className="block">
                    Quiz Repo <span className="ml-1 text-[11px] font-black rounded-full px-2 py-0.5 bg-purple-100 text-purple-900 align-middle">Quizzes</span>
                  </b>
                  <small className="text-xs text-gray-600">Not set up yet. Until it is, quizzes are skipped.</small>
                </span>
              </div>
            </div>
            <p className="inline-flex items-center gap-1 mt-2 text-[12.5px] text-gray-600">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Adding a repo comes later.
            </p>
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-gray-600 px-1">
            <Shield className="w-[13px] h-[13px] mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>Sign-ins and tokens will be stored encrypted in your computer's keychain, never written to disk in plain text. The app only changes the scripts in documents you tick, and backs each one up first.</span>
          </div>
        </div>
      )}
    </div>
  )
}

