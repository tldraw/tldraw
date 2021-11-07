import { contextBridge, ipcRenderer } from 'electron'
import type { Message, MessageToMain, TLApi } from 'src/types'

const api: TLApi = {
  sendMessage: (data: MessageToMain) => {
    ipcRenderer.send('projectMsg', data)
  },
  onMessage: (cb) => {
    ipcRenderer.on('projectMsg', (event, message) => cb(message as Message))
  },
}

contextBridge?.exposeInMainWorld('TLApi', api)

export {}
