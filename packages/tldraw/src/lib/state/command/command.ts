/* ------------------ Command Class ----------------- */

import { Data } from '../../types'

export type CommandFn<T> = (data: T, initial?: boolean) => void

/**
 * A command makes changes to some applicate state. Every command has an "undo"
 * method to reverse its changes. The apps history is a series of commands.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Command {
  timestamp = Date.now()
  name: string
  category: string
  private undoFn: CommandFn<Data>
  private doFn: CommandFn<Data>
  protected manualSelection: boolean

  selectedIds: string[]

  constructor(options: {
    do: CommandFn<Data>
    undo: CommandFn<Data>
    name: string
    category: string
    manualSelection?: boolean
  }) {
    this.name = options.name
    this.category = options.category
    this.doFn = options.do
    this.undoFn = options.undo
    this.manualSelection = options.manualSelection || false
  }

  undo = (data: Data): void => {
    data.pageState.selectedIds = this.selectedIds

    this.undoFn(data)
  }

  redo = (data: Data, initial = false): void => {
    this.selectedIds = [...data.pageState.selectedIds]

    this.doFn(data, initial)
  }
}
