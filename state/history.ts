import { Data } from 'types'
import { BaseCommand } from './commands/command'
import state from './state'

// A singleton to manage history changes.

class BaseHistory<T> {
  private stack: BaseCommand<T>[] = []
  private pointer = -1
  private maxLength = 100
  private _enabled = true

  execute = (data: T, command: BaseCommand<T>) => {
    command.redo(data, true)

    if (this.disabled) return
    this.stack = this.stack.slice(0, this.pointer + 1)
    this.stack.push(command)
    this.pointer++

    if (this.stack.length > this.maxLength) {
      this.stack = this.stack.slice(this.stack.length - this.maxLength)
      this.pointer = this.maxLength - 1
    }

    this.save(data)
  }

  undo = (data: T) => {
    if (this.pointer === -1) return
    const command = this.stack[this.pointer]
    command.undo(data)
    if (this.disabled) return
    this.pointer--
    this.save(data)
  }

  redo = (data: T) => {
    if (this.pointer === this.stack.length - 1) return
    const command = this.stack[this.pointer + 1]
    command.redo(data, false)
    if (this.disabled) return
    this.pointer++
    this.save(data)
  }

  load(data: T, id = 'code_slate_0.0.1') {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    const savedData = localStorage.getItem(id)

    if (savedData !== null) {
      Object.assign(data, this.restoreSavedData(JSON.parse(savedData)))
    }
  }

  save = (data: T, id = 'code_slate_0.0.1') => {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    localStorage.setItem(id, JSON.stringify(this.prepareDataForSave(data)))
  }

  disable = () => {
    this._enabled = false
  }

  enable = () => {
    this._enabled = true
  }

  prepareDataForSave(data: T): any {
    return { ...data }
  }

  restoreSavedData(data: any): T {
    return { ...data }
  }

  pop() {
    if (this.stack.length > 0) {
      this.stack.pop()
      this.pointer--
    }
  }

  get disabled() {
    return !this._enabled
  }
}

// App-specific

class History extends BaseHistory<Data> {
  constructor() {
    super()
  }

  prepareDataForSave(data: Data): any {
    const dataToSave: any = { ...data }

    dataToSave.selectedIds = Array.from(data.selectedIds.values())

    return dataToSave
  }

  restoreSavedData(data: any): Data {
    const restoredData: Data = { ...data }

    restoredData.selectedIds = new Set(restoredData.selectedIds)

    // Also restore camera position, which is saved separately in this app
    const cameraInfo = localStorage.getItem('code_slate_camera')

    if (cameraInfo !== null) {
      Object.assign(
        restoredData.pageStates[data.currentPageId].camera,
        JSON.parse(cameraInfo)
      )

      // And update the CSS property
      document.documentElement.style.setProperty(
        '--camera-zoom',
        restoredData.pageStates[data.currentPageId].camera.zoom.toString()
      )
    }

    return restoredData
  }
}

export default new History()
