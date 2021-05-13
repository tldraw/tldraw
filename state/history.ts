import { Data } from "types"
import { BaseCommand } from "./commands/command"

// A singleton to manage history changes.

class History<T> {
  private stack: BaseCommand<T>[] = []
  private pointer = -1
  private maxLength = 100
  private _enabled = true

  execute = (data: T, command: BaseCommand<T>) => {
    if (this.disabled) return
    this.stack = this.stack.slice(0, this.pointer + 1)
    this.stack.push(command)
    command.redo(data, true)
    this.pointer++

    if (this.stack.length > this.maxLength) {
      this.stack = this.stack.slice(this.stack.length - this.maxLength)
      this.pointer = this.maxLength - 1
    }

    this.save(data)
  }

  undo = (data: T) => {
    if (this.disabled) return
    if (this.pointer === -1) return
    const command = this.stack[this.pointer]
    command.undo(data)
    this.pointer--
    this.save(data)
  }

  redo = (data: T) => {
    if (this.disabled) return
    if (this.pointer === this.stack.length - 1) return
    const command = this.stack[this.pointer + 1]
    command.redo(data, false)
    this.pointer++
    this.save(data)
  }

  save = (data: T) => {
    if (typeof window === "undefined") return
    if (typeof localStorage === "undefined") return

    localStorage.setItem("code_slate_0.0.1", JSON.stringify(data))
  }

  disable = () => {
    this._enabled = false
  }

  enable = () => {
    this._enabled = true
  }

  get disabled() {
    return !this._enabled
  }
}

export default new History<Data>()
