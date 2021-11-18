import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const setPointedHandle: Action = (data, payload) => {
  mutables.pointedHandleId = payload.target
}
