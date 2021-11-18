import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const clearPointedShape: Action = () => {
  mutables.pointedShapeId = undefined
}
