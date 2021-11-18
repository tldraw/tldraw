import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const clearPointedHandle: Action = () => {
  mutables.pointedHandleId = undefined
}
