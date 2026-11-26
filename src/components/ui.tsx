/** Small shared pieces, styled as in Canvas Extractor Tools. */
import React from 'react'
import type { DocStatus } from '../logic/exampleData'
import { ACCOUNTS } from '../logic/exampleData'

export const PILL: Record<DocStatus, [string, string]> = {
  wait: ['Not checked', 'bg-gray-100 text-gray-800'],
  noscript: ['No Quiz Repo yet', 'bg-gray-100 text-gray-800'],
  ok: ['Up to date', 'bg-green-100 text-green-800'],
  out: ['Out of date', 'bg-amber-100 text-amber-900'],
  extra: ['Extra files', 'bg-amber-100 text-amber-900'],
  none: ['Script not found', 'bg-gray-200 text-gray-900'],
  perm: ['No permission', 'bg-red-100 text-red-800'],
}

export const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0033a0] focus-visible:ring-offset-1'

export function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`text-[11px] font-black rounded-full px-2 py-0.5 whitespace-nowrap ${className}`}>{children}</span>
}

export function AccountBadge({ who, size = 'sm' }: { who: 'GS' | 'EX'; size?: 'sm' | 'md' }) {
  const a = ACCOUNTS[who]
  const dims = size === 'sm' ? 'w-4 h-4 text-[7px]' : 'w-5 h-5 text-[9px]'
  return (
    <span
      role="img"
      aria-label={`Google account: ${a.email}`}
      title={a.email}
      className={`${dims} rounded-full ${who === 'GS' ? 'bg-[#0033a0]' : 'bg-gray-600'} text-white font-black inline-flex items-center justify-center flex-shrink-0`}
    >
      <span aria-hidden="true">{a.label}</span>
    </span>
  )
}

/** A link that opens a Google document or GitHub page in the person's web browser. */
export function OpenLink({ url, children = 'Open', label, className = '' }: { url: string; children?: React.ReactNode; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void window.api?.app.openExternal(url)
      }}
      title="Opens in your web browser. Nothing is ticked or changed."
      className={`inline-flex items-center gap-0.5 text-blue-700 underline font-bold rounded ${FOCUS_RING} ${className}`}
    >
      {children}
      {label && <span className="sr-only"> {label}</span>}
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
      <span className="sr-only"> (opens in your web browser)</span>
    </button>
  )
}

/**
 * A button that stays focusable when it cannot be used (aria-disabled rather than disabled),
 * so keyboard focus is never thrown back to the top of the page when it becomes unavailable.
 */
export function ActionButton({
  enabled,
  onClick,
  variant,
  children,
  why,
  className = '',
}: {
  enabled: boolean
  onClick(): void
  variant: 'primary' | 'outline' | 'danger'
  children: React.ReactNode
  /** Said to screen readers, and shown as a tooltip, when the button cannot be used. */
  why?: string
  className?: string
}) {
  const on =
    variant === 'primary'
      ? 'bg-[#0033a0] text-white hover:bg-[#002d8f] border-2 border-[#0033a0]'
      : variant === 'danger'
        ? 'bg-red-700 text-white hover:bg-red-800 border-2 border-red-700'
        : 'border-2 border-[#0033a0] text-[#0033a0] bg-white hover:bg-blue-50'
  const off = variant === 'outline' ? 'border-2 border-gray-400 text-gray-600 bg-white cursor-not-allowed' : 'bg-gray-200 text-gray-700 border-2 border-gray-200 cursor-not-allowed'
  return (
    <button
      type="button"
      aria-disabled={!enabled}
      title={!enabled ? why : undefined}
      onClick={() => enabled && onClick()}
      className={`rounded-xl text-sm font-black ${enabled ? on : off} ${FOCUS_RING} ${className}`}
    >
      {children}
      {!enabled && why && <span className="sr-only"> ({why})</span>}
    </button>
  )
}

/**
 * Pick-one control: real radio buttons drawn as a segmented control. A disabled option says
 * why in words (not only in a tooltip). `faded` draws the group with a dashed border, for the
 * "Mixed" state, while keeping the text readable.
 */
export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  faded = false,
}: {
  name: string
  label: string
  options: { value: T; label: string; disabled?: boolean; reason?: string }[]
  value: T | null
  onChange: (v: T) => void
  faded?: boolean
}) {
  return (
    <span role="radiogroup" aria-label={label} className={`inline-flex rounded-lg border-2 text-[11.5px] font-black ${faded ? 'border-dashed border-gray-500 bg-gray-50' : 'border-gray-500 bg-white'}`}>
      {options.map((o) => (
        <label
          key={o.value}
          title={o.disabled ? o.reason : undefined}
          className={`relative border-l border-gray-500 first:border-l-0 first:[&>span]:rounded-l-md last:[&>span]:rounded-r-md ${o.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            className="sr-only peer"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          <span className="block px-2.5 py-1 text-gray-700 peer-checked:bg-[#0033a0] peer-checked:text-white peer-disabled:text-gray-500 peer-disabled:bg-gray-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0033a0]">
            {o.label}
            {o.disabled && o.reason && <span className="sr-only"> ({o.reason})</span>}
          </span>
        </label>
      ))}
    </span>
  )
}
