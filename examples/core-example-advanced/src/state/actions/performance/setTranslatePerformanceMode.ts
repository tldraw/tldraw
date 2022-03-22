import { TLPerformanceMode } from '@tlslides/core'
import type { Action } from 'state/constants'

export const setTranslatePerformanceMode: Action = (data) => {
  data.performanceMode = undefined
}
