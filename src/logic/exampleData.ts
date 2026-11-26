/**
 * TEST BUILD example data. Nothing here comes from Google or GitHub. The stamps for the 13
 * Main Repo files are the real "Last updated" lines from blueprint-tools-script; everything
 * else is invented to show each kind of difference.
 */
import type { DocChoice, FileSet, Repos } from './compare'

export const MAIN_FILES: [string, string][] = [
  ['Code.gs', '2026-09-12 21:14 MDT'], ['Code2.gs', '2026-09-25 14:25 MDT'], ['Code3.gs', '2026-07-19 09:22 MDT'],
  ['Code5.gs', '2026-08-30 13:36 MDT'], ['Code8.gs', '2026-09-07 19:51 MDT'], ['Code9.gs', '2026-09-08 01:19 MDT'],
  ['Sidebar.html', '2026-09-07 20:28 MDT'], ['Sidebar2.html', '2026-09-04 09:44 MDT'], ['Sidebar3.html', '2026-07-19 09:22 MDT'],
  ['Sidebar5.html', '2026-09-07 20:47 MDT'], ['Sidebar8.html', '2026-09-07 19:51 MDT'], ['Sidebar9.html', '2026-09-12 21:14 MDT'],
  ['appsscript.json', '2026-07-19 09:22 MDT'],
]

const MAIN: FileSet = Object.fromEntries(MAIN_FILES.map(([f, s]) => [f, { s, v: 'm' }]))
const EXP: FileSet = {
  ...MAIN,
  'Code.gs': { s: '2026-08-20 15:40 MDT', v: 'x' },
  'appsscript.json': { s: '2026-11-25 16:34 MST', v: 'x' },
  'Code10.gs': { s: '2026-11-25 16:34 MST', v: 'x' },
  'Sidebar10.html': { s: '2026-11-25 16:34 MST', v: 'x' },
}
export const REPOS: Repos = { main: MAIN, exp: EXP }

export type DocStatus = 'wait' | 'noscript' | 'ok' | 'out' | 'extra' | 'none' | 'perm'

export interface ExampleDoc {
  id: string
  name: string
  type: 'Blueprint' | 'Quiz'
  account: 'GS' | 'EX'
  url: string
  status: DocStatus
  note: string
  files?: FileSet
}

const biol: FileSet = {
  ...MAIN,
  'Code2.gs': { s: '2026-08-14 11:02 MDT', v: 'o' },
  'Code8.gs': { s: '2026-08-02 09:15 MDT', v: 'o' },
  'Sidebar8.html': { s: '2026-08-02 09:15 MDT', v: 'o' },
}
delete biol['Code9.gs']
delete biol['Sidebar9.html']

// Addresses are made up; "Open" goes to Google, which will say the file does not exist.
const fake = (id: string) => `https://docs.google.com/document/d/${id}/edit`

export const DOCS: ExampleDoc[] = [
  { id: 'biol', name: 'BIOL 1010 Blueprint', type: 'Blueprint', account: 'GS', url: fake('EXAMPLE-biol1010'), status: 'out', note: 'Behind both repos', files: biol },
  { id: 'quiz', name: 'BIOL 1010 Module 3 Quiz', type: 'Quiz', account: 'GS', url: fake('EXAMPLE-biol1010-quiz'), status: 'noscript', note: 'Skipped: there is no Quiz Repo yet' },
  { id: 'hlth', name: 'HLTH 2200 Blueprint', type: 'Blueprint', account: 'GS', url: fake('EXAMPLE-hlth2200'), status: 'extra', note: '1 file is not in GitHub (MyNotes.gs), and Code.gs was edited in the document', files: { ...MAIN, 'Code.gs': { s: '2026-09-12 21:14 MDT', v: 'e' }, 'MyNotes.gs': { s: '', v: 'n' } } },
  { id: 'hquiz', name: 'HLTH 2200 Introduction to Community and Public Health: Final Exam Quiz Questions (Fall 2026 revision)', type: 'Quiz', account: 'GS', url: fake('EXAMPLE-hlth2200-quiz'), status: 'noscript', note: 'Skipped: there is no Quiz Repo yet' },
  { id: 'psyc', name: 'PSYC 3015 Blueprint', type: 'Blueprint', account: 'EX', url: fake('EXAMPLE-psyc3015'), status: 'out', note: 'Set up from the Experimental Repo', files: { ...EXP } },
  { id: 'nurs', name: 'NURS 4100 Blueprint', type: 'Blueprint', account: 'GS', url: fake('EXAMPLE-nurs4100'), status: 'perm', note: 'You can view this document but not edit it' },
  { id: 'hist', name: 'HIST 1120 Blueprint', type: 'Blueprint', account: 'EX', url: fake('EXAMPLE-hist1120'), status: 'none', note: 'Open it once so its script can be found, or paste its script ID' },
]

export const START_CHOICES: Record<string, DocChoice> = {
  biol: { doc: 'main', t: {} },
  hlth: { doc: 'main', t: {} },
  psyc: { doc: 'main', t: {} },
}

export const ACCOUNTS = {
  GS: { label: 'GS', email: 'gregsnow@boisestate.edu', name: 'Greg Snow' },
  EX: { label: 'EX', email: 'extrasnow75@gmail.com', name: 'extrasnow75' },
} as const

export const SUPPORT_CONTACT = 'Greg Snow (gregsnow@boisestate.edu or extrasnow75@gmail.com)'
