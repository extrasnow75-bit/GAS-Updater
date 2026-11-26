/**
 * GAS Updater, main process.
 *
 * TEST BUILD: the app shows example data only. It makes no network calls and does not
 * connect to Google or GitHub. The window, title bar, zoom and link handling follow
 * Canvas Extractor Tools so the apps look and behave the same.
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron'
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
    width: 980,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    titleBarStyle: IS_MAC ? 'hiddenInset' : 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 13, y: 11 } }
      : { titleBarOverlay: { color: '#0033a0', symbolColor: '#ffffff', height: 36 } }),
    backgroundColor: '#f8fafc',
    icon: join(__dirname, '../../resources/icon.png'),
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
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomLevel(getSavedZoomLevel())
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

function senderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('The app window has closed.')
  return win
}

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:getZoom', (event) => ({
  level: senderWindow(event).webContents.getZoomLevel(),
  min: MIN_ZOOM_LEVEL,
  max: MAX_ZOOM_LEVEL,
}))
ipcMain.handle('app:stepZoom', (event, delta: number) => stepZoom(senderWindow(event), Math.sign(delta)))
ipcMain.handle('app:resetZoom', (event) => applyZoomLevel(senderWindow(event), 0))
ipcMain.handle('app:openExternal', (_event, url: string) => openExternalSafely(String(url)))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit()
})
