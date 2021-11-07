import { contextBridge, ipcRenderer } from 'electron'
import type { Message, TLApi } from 'src/types'

const api: TLApi = {
  send: (channel: string, data: Message) => {
    ipcRenderer.send(channel, data)
  },
  on: (channel, cb) => {
    ipcRenderer.on(channel, (event, message) => cb(message as Message))
  },
}

contextBridge?.exposeInMainWorld('TLApi', api)

export {}
