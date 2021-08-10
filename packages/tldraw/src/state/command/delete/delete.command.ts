import type { Data, Command } from '../../state-types'

export function deleteShapes(data: Data, ids: string[]): Command {
  return {
    id: 'toggle_shapes',
    before: {
      page: {
        shapes: Object.fromEntries(ids.map((id) => [id, data.page.shapes[id]])),
      },
      pageState: {
        selectedIds: [...data.pageState.selectedIds],
        hoveredId: undefined
      },
    },
    after: {
      page: {
        shapes: Object.fromEntries(ids.map((id) => [id, undefined])),
      },
      pageState: {
        selectedIds: [],
        hoveredId: undefined
      },
    },
  }
}
