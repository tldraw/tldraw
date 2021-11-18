import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const clearSnapInfo: Action = () => {
  mutables.snapInfo = undefined
}
