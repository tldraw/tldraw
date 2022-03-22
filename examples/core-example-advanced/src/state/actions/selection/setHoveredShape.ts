import type { TLPointerInfo } from '@tlslides/core'
import type { Action } from 'state/constants'

export const setHoveredShape: Action = (data, payload: TLPointerInfo) => {
  data.pageState.hoveredId = payload.target
}
