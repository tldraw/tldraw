import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const clearIsCloning: Action = () => {
  mutables.isCloning = false
}
