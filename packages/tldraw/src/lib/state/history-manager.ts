import { Data } from '../types'
import { BaseCommand } from './commands/command'
// import storage from './storage'

// A singleton to manage history changes.

export class HistoryManager<T extends Data> {
  private stack: BaseCommand<T>[] = []
  private pointer = -1
  private maxLength = 100
  private _enabled = true

  onCommand: (name: string, data: T) => void

  constructor(onCommand: (name: string, data: T) => void) {
    this.onCommand = onCommand
  }

  execute = (data: T, command: BaseCommand<T>) => {
    command.redo(data, true)
    this.onCommand(command.name, data)

    if (this.disabled) return
    this.stack = this.stack.slice(0, this.pointer + 1)
    this.stack.push(command)
    this.pointer++

    if (this.stack.length > this.maxLength) {
      this.stack = this.stack.slice(this.stack.length - this.maxLength)
      this.pointer = this.maxLength - 1
    }
  }

  undo = (data: T) => {
    if (this.pointer === -1) return

    const command = this.stack[this.pointer]
    command.undo(data)
    this.onCommand(command.name, data)
    if (this.disabled) return
    this.pointer--
  }

  redo = (data: T) => {
    if (this.pointer === this.stack.length - 1) return
    const command = this.stack[this.pointer + 1]
    command.redo(data, false)
    this.onCommand(command.name, data)
    if (this.disabled) return
    this.pointer++
  }

  disable = () => {
    this._enabled = false
  }

  enable = () => {
    this._enabled = true
  }

  pop() {
    if (this.stack.length > 0) {
      this.stack.pop()
      this.pointer--
    }
  }

  reset() {
    this.stack = []
    this.pointer = -1
    this.maxLength = 100
    this._enabled = true
  }

  get disabled() {
    return !this._enabled
  }
}
