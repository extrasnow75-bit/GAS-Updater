import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

/** The only things the window can ask the main process to do. */
const api = {
  app: {
    platform: process.platform,
    getZoom: (): Promise<{ level: number; min: number; max: number }> => ipcRenderer.invoke('app:getZoom'),
    stepZoom: (delta: 1 | -1): Promise<number> => ipcRenderer.invoke('app:stepZoom', delta),
    resetZoom: (): Promise<number> => ipcRenderer.invoke('app:resetZoom'),
    onZoomChanged: (callback: (level: number) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, level: number) => callback(level)
      ipcRenderer.on('app:zoomChanged', listener)
      return () => ipcRenderer.removeListener('app:zoomChanged', listener)
    },
    /** Opens a Google document, Drive file or GitHub page in the person's web browser. */
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
    /** Puts text on the clipboard. */
    copyText: (text: string): Promise<void> => ipcRenderer.invoke('app:copyText', text),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
