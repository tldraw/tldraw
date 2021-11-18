import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const clearPointedBoundsHandle: Action = (data, payload) => {
  mutables.pointedBoundsHandleId = undefined
}
