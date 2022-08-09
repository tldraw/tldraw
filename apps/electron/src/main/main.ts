import { BrowserWindow, app } from 'electron'
import { is } from 'electron-util'
import type { Message } from 'src/types'
import { createMenu } from './createMenu'
import { createWindow } from './createWindow'
import './preload'

let win: BrowserWindow | null = null

async function main() {
  win = await createWindow()

  async function send(message: Message) {
    win!.webContents.send('projectMsg', message)
  }

  await createMenu(send)
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
