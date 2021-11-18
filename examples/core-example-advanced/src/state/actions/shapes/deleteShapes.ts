import type { Action } from 'state/constants'

export const deleteShapes: Action = (data, payload: { ids: string[] }) => {
  try {
    data.pageState.selectedIds = data.pageState.selectedIds.filter(
      (id) => !payload.ids.includes(id)
    )

    payload.ids.forEach((id) => {
      delete data.page.shapes[id]
    })
  } catch (e: any) {
    e.message = 'Could not delete shapes: ' + e.message
    console.error(e)
  }
}
