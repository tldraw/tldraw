import { app, BrowserView } from 'electron'
import path from 'path'
import { is } from 'electron-util'
import EventEmitter from 'events'
import createMainWindow from './createWindow'
import https from 'https'
import fs from 'fs'

const loadingEvents = new EventEmitter()

app.whenReady().then(() => {
  const window = createMainWindow()
  window.maximize()
  window.setMenu(null)
  const size = window.getSize()
  const isDev = is.development
  window.loadFile(path.join(__dirname, '../../loading/loading.html'))

  loadingEvents.on('finished', () => {
    const view = new BrowserView({ webPreferences: { nativeWindowOpen: true, devTools: true } })
    if (isDev) view.webContents.openDevTools()
    window.setBrowserView(view)
    view.setBounds({ x: 0, y: 0, width: size[0], height: size[1] })
    view.setAutoResize({ width: true, height: true })
    view.webContents.loadURL('https://www.tldraw.com/')
  })

  loadingEvents.on('progress', (percentage: number) => {
    window.webContents.send('progress', percentage)
  })

  download(
    'https://images.unsplash.com/photo-1645803804592-b7e2baf557ca?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80'
  )
})

// Waiting for the website to finish loading
const download = (url: string) => {
  const file = fs.createWriteStream('big-file.jpg')

  https.get(url, function (response) {
    let total = 0
    response.on('data', (c) => {
      total += c.length
      // @ts-expect-error
      loadingEvents.emit('progress', total / response.headers['content-length'])
    })
    response.pipe(file)
    file
      .on('finish', function () {
        loadingEvents.emit('finished')
        file.close(() => loadingEvents.emit('finished'))
      })
      .on('error', function (err) {
        fs.unlink('./text.txt', (err) => console.error(err))
      })
  })
}
