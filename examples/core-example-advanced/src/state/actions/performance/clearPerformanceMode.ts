import type { Action } from 'state/constants'

export const clearPerformanceMode: Action = (data) => {
  data.performanceMode = undefined
}
