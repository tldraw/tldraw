import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const undo: Action = (data) => {
  const snapshot = mutables.history.undo()
  Object.assign(data, snapshot)
}
