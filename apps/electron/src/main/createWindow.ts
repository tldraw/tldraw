/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BrowserWindow } from 'electron'
import path from 'path'

const createMainWindow = () =>
  new BrowserWindow({
    title: 'Tldraw',
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    icon: path.join(__dirname, '../../assets/icon.png'),
  })

export default createMainWindow
