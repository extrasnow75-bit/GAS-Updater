/**
 * A dialog that behaves properly for keyboard and screen-reader users, following the Help
 * Center drawer in Canvas Extractor Tools:
 * - the rest of the app is made `inert` while it is open, so nothing behind it can be reached;
 * - Tab and Shift+Tab wrap around inside it;
 * - Escape closes it;
 * - focus moves into it once when it opens (not on every refresh of the app), and goes back to
 *   whatever had focus before when it closes, or to `fallbackFocus` if that has gone.
 */
import React, { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  labelledBy,
  onClose,
  children,
  initialFocus,
  fallbackFocus,
  width = 'max-w-xl',
}: {
  labelledBy: string
  onClose(): void
  children: React.ReactNode
  /** CSS selector inside the dialog to focus first. Defaults to the dialog itself. */
  initialFocus?: string
  /** Where focus goes on close if the element that opened the dialog no longer exists. */
  fallbackFocus?: () => HTMLElement | null
  width?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Kept in refs so a parent re-rendering (which it does many times a second during a run)
  // does not re-run the open/close effect and steal focus.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const fallbackRef = useRef(fallbackFocus)
  fallbackRef.current = fallbackFocus

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const shell = document.getElementById('app-shell')
    shell?.setAttribute('inert', '')
    const dialog = ref.current!
    const first = initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null
    ;(first ?? dialog).focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === firstEl || active === dialog)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    dialog.addEventListener('keydown', onKey)
    return () => {
      dialog.removeEventListener('keydown', onKey)
      shell?.removeAttribute('inert')
      // After the dialog has gone, so the opener is focusable again.
      requestAnimationFrame(() => {
        const target = opener && opener.isConnected && opener !== document.body ? opener : fallbackRef.current?.()
        target?.focus()
      })
      // Closing can change the page (Initial setup folds away when it is complete), which can
      // remove the element focus went back to. If focus has fallen to the page, use the fallback.
      setTimeout(() => {
        if (document.activeElement === document.body || !document.activeElement) fallbackRef.current?.()?.focus()
      }, 150)
    }
    // Runs once per opening on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/40 flex items-start justify-center p-3 sm:p-6 overflow-auto"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onCloseRef.current()}
    >
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`w-full ${width} bg-white rounded-2xl shadow-xl overflow-hidden focus:outline-none`}>
        {children}
      </div>
    </div>
  )
}
