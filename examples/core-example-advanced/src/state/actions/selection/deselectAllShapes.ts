import type { Action } from 'state/constants'

export const deselectAllShapes: Action = (data) => {
  data.pageState.selectedIds = []
}
