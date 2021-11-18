import type { Action } from 'state/constants'

export const clearHoveredShape: Action = (data) => {
  data.pageState.hoveredId = undefined
}
