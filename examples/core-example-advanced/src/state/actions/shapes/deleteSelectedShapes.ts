import type { Action } from 'state/constants'

export const deleteSelectedShapes: Action = (data) => {
  const { page, pageState } = data
  if (pageState.hoveredId && pageState.selectedIds.includes(pageState.hoveredId)) {
    pageState.hoveredId = undefined
  }
  pageState.selectedIds.forEach((id) => delete page.shapes[id])
  pageState.selectedIds = []
}
