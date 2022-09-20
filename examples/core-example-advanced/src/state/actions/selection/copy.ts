import type { Action } from 'state/constants'

export const copy: Action = (data) => {
  Object.values(data.page.shapes)
    .filter((shape) => data.pageState.selectedIds.includes(shape.id))
    .forEach((shape) => {
      shape.isCopied = true
    })

  Object.values(data.page.shapes)
    .filter((shape) => !data.pageState.selectedIds.includes(shape.id))
    .forEach((shape) => {
      shape.isCopied = false
    })
}
