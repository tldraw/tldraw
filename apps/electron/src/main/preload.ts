import { contextBridge, ipcRenderer } from 'electron'
import type { Message, TldrawBridgeApi } from 'src/types'

const api: TldrawBridgeApi = {
  send: (channel: string, data: Message) => {
    ipcRenderer.send(channel, data)
  },
  on: (channel, cb) => {
    ipcRenderer.on(channel, (event, message) => cb(message as Message))
  },
}

contextBridge?.exposeInMainWorld('TldrawBridgeApi', api)

export {}
