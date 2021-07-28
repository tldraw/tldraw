/* ------------------ Command Class ----------------- */

import { Data } from '../../types'

export type CommandFn<T> = (data: T, initial?: boolean) => void

/**
 * A command makes changes to some applicate state. Every command has an "undo"
 * method to reverse its changes. The apps history is a series of commands.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseCommand<T extends any> {
  timestamp = Date.now()
  name: string
  category: string
  private undoFn: CommandFn<T>
  private doFn: CommandFn<T>
  protected restoreBeforeSelectionState: (data: T) => void
  protected restoreAfterSelectionState: (data: T) => void
  protected manualSelection: boolean

  abstract saveSelectionState: (data: T) => (data: T) => void

  constructor(options: {
    do: CommandFn<T>
    undo: CommandFn<T>
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

  undo = (data: T): void => {
    if (this.manualSelection) {
      this.undoFn(data)
      return
    }

    // We need to set the selection state to what it was before we after we did the command
    this.restoreAfterSelectionState?.(data)
    this.undoFn(data)
    this.restoreBeforeSelectionState?.(data)
  }

  redo = (data: T, initial = false): void => {
    if (this.manualSelection) {
      this.doFn(data, initial)
      return
    }

    if (!initial) {
      this.restoreBeforeSelectionState?.(data)
    }

    // We need to set the selection state to what it was before we did the command
    this.doFn(data, initial)

    if (initial) {
      this.restoreAfterSelectionState = this.saveSelectionState?.(data)
    }
  }
}

/* ---------------- Project Specific ---------------- */

/**
 * A subclass of BaseCommand that sends events to our state. In our case, we want our actions
 * to mutate the state's data. Actions do not effect the "active states" in
 * the app.
 */
export class Command extends BaseCommand<Data> {
  saveSelectionState = (data: Data): ((next: Data) => void) => {
    const selectedIds = [...data.pageState.selectedIds]

    return (next: Data) => {
      next.pageState.selectedIds = selectedIds
    }
  }
}
