import { TLPerformanceMode } from '@tlslides/core'
import type { Action } from 'state/constants'

export const setTransformPerformanceMode: Action = (data) => {
  data.performanceMode = undefined
}
