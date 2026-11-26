/**
 * GAS Updater, main process.
 *
 * TEST BUILD: the app shows example data only. It makes no network calls and does not
 * connect to Google or GitHub. The window, title bar, zoom and link handling follow
 * Canvas Extractor Tools so the apps look and behave the same, with the extra hardening from
 * the 2026-11-26 security review (see docs/reviews/).
 */
import { app, BrowserWindow, clipboard, ipcMain, session, shell, type IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import {
  applyZoomLevel,
  getSavedZoomLevel,
  registerZoomShortcuts,
  stepZoom,
  MIN_ZOOM_LEVEL,
  MAX_ZOOM_LEVEL,
} from './ipc/zoom'
import { isAllowedExternalUrl } from './ipc/externalUrls'

const IS_MAC = process.platform === 'darwin'

/** The longest text the window may ask to copy (a full results table is far smaller). */
const MAX_COPY_CHARS = 2_000_000

/** True only for a navigation back to the page this window already shows (see Extractor Tools). */
function isOwnPage(win: BrowserWindow, url: string): boolean {
  const current = win.webContents.getURL()
  if (!current) return false
  try {
    const target = new URL(url)
    const here = new URL(current)
    if (here.origin === 'null' || target.origin === 'null') {
      return target.protocol === here.protocol && target.pathname === here.pathname
    }
    return target.origin === here.origin
  } catch {
    return false
  }
}

/** Opens a web page in the person's own browser, but only an https page on an allowed site. */
async function openExternalSafely(url: string): Promise<void> {
  if (!isAllowedExternalUrl(url)) return
  await shell.openExternal(url)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 720,
    minHeight: 560,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
    },
    titleBarStyle: IS_MAC ? 'hiddenInset' : 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 13, y: 11 } }
      : { titleBarOverlay: { color: '#0033a0', symbolColor: '#ffffff', height: 36 } }),
    backgroundColor: '#f8fafc',
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafely(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (isOwnPage(win, url)) return
    event.preventDefault()
    void openExternalSafely(url)
  })

  registerZoomShortcuts(win)
  // applyZoomLevel (not a bare setZoomLevel) so the Text size readout hears about it.
  win.webContents.on('did-finish-load', () => {
    applyZoomLevel(win, getSavedZoomLevel())
  })

  // The development server address is honoured only when running from source. In the
  // installed app this setting is ignored, so nobody can point the window (and the preload
  // bridge) at a page of their own.
  const devUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

/**
 * Every request from the window must come from the app's own page, in its main frame. Anything
 * else (a frame, a page loaded some other way) is refused before the handler runs.
 */
function trustedWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  const frame = event.senderFrame
  if (!win || !frame || frame !== event.sender.mainFrame || !isOwnPage(win, frame.url)) {
    throw new Error('This request did not come from the GAS Updater window.')
  }
  return win
}

ipcMain.handle('app:getZoom', (event) => ({
  level: trustedWindow(event).webContents.getZoomLevel(),
  min: MIN_ZOOM_LEVEL,
  max: MAX_ZOOM_LEVEL,
}))
ipcMain.handle('app:stepZoom', (event, delta: unknown) => {
  const win = trustedWindow(event)
  if (delta !== 1 && delta !== -1) throw new Error('Text size can only change one step at a time.')
  return stepZoom(win, delta)
})
ipcMain.handle('app:resetZoom', (event) => applyZoomLevel(trustedWindow(event), 0))
ipcMain.handle('app:openExternal', (event, url: unknown) => {
  trustedWindow(event)
  if (typeof url !== 'string') return
  return openExternalSafely(url)
})
// Copying goes through here so the window never needs clipboard permission.
ipcMain.handle('app:copyText', (event, text: unknown) => {
  trustedWindow(event)
  if (typeof text !== 'string' || text.length > MAX_COPY_CHARS) throw new Error('That could not be copied.')
  clipboard.writeText(text)
})

// No window may ever host a <webview> or open a new window inside the app.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault())
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})

app.whenReady().then(() => {
  // The app needs no camera, microphone, location, notifications or clipboard reading.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit()
})
