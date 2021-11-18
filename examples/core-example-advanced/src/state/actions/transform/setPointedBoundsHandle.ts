import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const setPointedBoundsHandle: Action = (data, payload) => {
  mutables.pointedBoundsHandleId = payload.target
}
