import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { Plugin } from 'vite'

/**
 * Content-Security-Policy for the packaged window.
 *
 * The window makes no network requests of its own. Every Google and GitHub call will happen in
 * the main process and arrive over IPC, and tokens never reach the window. So `connect-src
 * 'none'` costs nothing and closes the quiet ways data could leak out: fetch, XHR, WebSocket,
 * beacons. Images are limited to the app's own files (no remote images at all).
 *
 * `style-src` needs 'unsafe-inline' because React writes `style={{…}}` as inline style
 * attributes (the draggable title bar, the progress bar width).
 *
 * Injected at build time only; the dev server needs a websocket and inline scripts.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`,
      )
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload.ts') },
      },
    },
  },
  renderer: {
    root: '.',
    server: {
      watch: {
        // Once electron-builder has run, `release/` holds ~77 MB of packaged Electron files.
        // Watching them makes the dev server fire an endless HMR reload storm on
        // release/win-unpacked/LICENSES.chromium.html. Nothing in there is a source file.
        ignored: ['**/release/**', '**/out/**'],
      },
    },
    plugins: [react(), cspPlugin()],
    build: {
      // electron-vite does not minify the renderer by default. Nobody will feel the
      // difference loading from local disk; it just keeps the installer smaller.
      minify: process.env.NO_MINIFY ? false : true,
      rollupOptions: {
        input: { index: resolve(__dirname, 'index.html') },
      },
    },
    // The postcss config is discovered automatically. It used to be named here as
    // `postcss.config.js`, which stopped being true when the file became `.mjs` — Tailwind
    // kept working only because Vite fell back to auto-discovery, so the setting was a
    // misleading no-op rather than an error.
  },
})
