import { BrowserWindow } from 'electron'
import { is } from 'electron-util'
import path from 'path'

export async function createWindow() {
  let win: BrowserWindow | null = null

  win = new BrowserWindow({
    width: 720,
    height: 450,
    minHeight: 480,
    minWidth: 600,
    titleBarStyle: 'hidden',
    title: 'Tldraw',
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: false,
    show: false,
  })

  win.setWindowButtonVisibility(false)

  const isDev = is.development

  if (isDev) {
    win.loadURL('http://localhost:9080')
  } else {
    win.loadURL(path.join(__dirname, 'index.html'))
  }

  win.setPosition(0, 0, false)
  win.setSize(700, 1200)

  win.on('closed', () => {
    win = null
  })

  win.webContents.on('devtools-opened', () => {
    win!.focus()
  })

  win.on('ready-to-show', () => {
    win!.show()

    if (isDev) {
      win!.webContents.openDevTools({ mode: 'bottom' })
    } else {
      win!.focus()
    }
  })

  return win
}
