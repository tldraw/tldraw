/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from 'fs'
import { nanoid } from 'nanoid'
import { dialog, ipcMain, IpcMainEvent } from 'electron'
import { sendMessage } from '../window'
import type { TLDrawDocument, TLDrawFile } from '@tldraw/tldraw'
import type { MessageToMain } from 'src/types'

export class FileSystemManager {
  currentPath?: string
  isDirty = false
  currentFile = FileSystemManager.getNewFile()

  // public win: BrowserWindow

  constructor() {
    ipcMain.on('projectMsg', (_: IpcMainEvent, message: MessageToMain) => {
      switch (message.type) {
        case 'change': {
          this.currentFile.document = message.document
          this.isDirty = true
          break
        }
      }
    })

    // Set listener for close while dirty
  }

  newFile = async () => {
    const file = FileSystemManager.getNewFile()
    this.currentFile = file
    sendMessage({ type: 'newFile', file })
  }

  openFile = async () => {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          extensions: ['.tldr'],
          name: 'TLDraw',
        },
      ],
    })

    if (fileObj.canceled) return

    fs.readFile(fileObj.filePaths[0], 'utf-8', (err, data) => {
      if (err) {
        alert('An error ocurred reading the file :' + err.message)
        return
      }

      sendMessage({ type: 'openFile', file: JSON.parse(data) })
    })
  }

  saveFile = async () => {
    if (this.isDirty) {
      if (!this.currentPath) {
        const fileObj = await dialog.showSaveDialog({
          properties: ['showOverwriteConfirmation'],
          filters: [
            {
              extensions: ['.tldr'],
              name: 'TLDraw',
            },
          ],
        })

        if (fileObj.canceled) return
        if (!fileObj.filePath) return

        this.currentPath = fileObj.filePath
      }

      fs.writeFile(this.currentPath, JSON.stringify(this.currentFile, null, 2), () => {
        this.isDirty = false
      })
    }
  }

  async saveFileAs() {
    const result = await dialog.showSaveDialog({})
  }

  static getNewFile = (): TLDrawFile => {
    const doc: TLDrawDocument = {
      id: nanoid(),
      name: 'New Document',
      version: 13,
      pages: {
        page: {
          id: 'page',
          name: 'Page 1',
          childIndex: 1,
          shapes: {},
          bindings: {},
        },
      },
      pageStates: {
        page: {
          id: 'page',
          selectedIds: [],
          camera: {
            point: [0, 0],
            zoom: 1,
          },
        },
      },
    }

    return {
      name: 'New Document',
      fileHandle: null,
      document: doc,
      assets: {},
    }
  }
}

export const fileSystemManager = new FileSystemManager()
