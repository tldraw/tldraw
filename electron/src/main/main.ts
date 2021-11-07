/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { app, BrowserWindow, ipcRenderer, IpcRendererEvent } from 'electron'
import { is } from 'electron-util'
import { createMenu } from './menu'
import { win, createWindow } from './window'
import './preload'

async function main() {
  await createWindow()
  await createMenu()
}

app
  .on('ready', main)
  .on('window-all-closed', () => {
    if (!is.macos) {
      app.quit()
    }
  })
  .on('activate', () => {
    if (win === null && app.isReady()) {
      main()
    }
  })
