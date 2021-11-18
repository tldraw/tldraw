import type { TLPointerInfo } from '@tldraw/core'
import type { Action } from 'state/constants'
import { getPagePoint } from 'state/helpers'
import { mutables } from 'state/mutables'

export const setInitialPoint: Action = (data, payload: TLPointerInfo) => {
  mutables.initialPoint = getPagePoint(payload.origin, data.pageState)
  mutables.previousPoint = [...mutables.initialPoint]
}
