import type { Action } from 'state/constants'

export const selectAllShapes: Action = (data) => {
  data.pageState.selectedIds = Object.keys(data.page.shapes)
}
