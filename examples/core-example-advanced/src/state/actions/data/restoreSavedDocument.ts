import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const restoreSavedDocument: Action = (data) => {
  const snapshot = mutables.history.restore()
  Object.assign(data, snapshot)
}
