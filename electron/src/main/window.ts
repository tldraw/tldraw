/* eslint-disable @typescript-eslint/no-non-null-assertion */
import path from 'path'
import { BrowserWindow, ipcMain, IpcMainEvent, ipcRenderer } from 'electron'
import { is } from 'electron-util'
import type { Message, MessageToMain } from 'src/types'

export let win: BrowserWindow | null = null

export async function sendMessage(message: Message) {
  win!.webContents.send('projectMsg', message)
}

export async function createWindow() {
  win = new BrowserWindow({
    width: 720,
    height: 450,
    minHeight: 480,
    minWidth: 600,
    titleBarStyle: 'hidden',
    title: 'TLDraw',
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
  win.setSize(700, 600)

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
