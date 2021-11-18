import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const restoreSnapshot: Action = (data) => {
  Object.assign(data, mutables.snapshot)
}
