/* ------------------ Command Class ----------------- */
import { Utils } from '@tldraw/core'
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
  private before: Partial<Data>
  private after: Partial<Data>

  selectedIds: string[]

  constructor(options: {
    before: Partial<Data>
    after: Partial<Data>
    name: string
    category: string
  }) {
    this.name = options.name
    this.category = options.category
    this.before = options.before
    this.after = options.after
  }

  undo = (data: Data): Data => {
    data.pageState.selectedIds = this.selectedIds
    return Utils.deepMerge<Data>(data, this.before)
  }

  redo = (data: Data): Data => {
    this.selectedIds = [...data.pageState.selectedIds]
    return Utils.deepMerge<Data>(data, this.after)
  }

  do = (data: Data): Data => {
    this.selectedIds = [...data.pageState.selectedIds]
    return Utils.deepMerge<Data>(data, this.after)
  }
}
