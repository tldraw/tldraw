import path from 'path'
import { format } from 'url'
import { app, BrowserWindow } from 'electron'
import { is } from 'electron-util'

let win: BrowserWindow | null = null

async function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 820,
    minHeight: 600,
    minWidth: 650,
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
    },
    show: false,
  })

  const isDev = is.development

  if (isDev) {
    win.loadURL('http://localhost:9080')
  } else {
    win.loadURL(
      format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true,
      })
    )
  }

  win.on('closed', () => {
    win = null
  })

  win.webContents.on('devtools-opened', () => {
    win!.focus()
  })

  win.on('ready-to-show', () => {
    win!.show()
    win!.focus()

    if (isDev) {
      win!.webContents.openDevTools({ mode: 'bottom' })
    }
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (!is.macos) {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null && app.isReady()) {
    createWindow()
  }
})
