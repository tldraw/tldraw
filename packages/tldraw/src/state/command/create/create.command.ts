import type { TLDrawShape } from '../../../shape'
import type { Data, Command } from '../../state-types'

export function create(data: Data, shapes: TLDrawShape[]): Command {
  return {
    id: 'toggle_shapes',
    before: {
      page: {
        shapes: Object.fromEntries(shapes.map((shape) => [shape.id, undefined])),
      },
      pageState: {
        selectedIds: [...data.pageState.selectedIds],
      },
    },
    after: {
      page: {
        shapes: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
      },
      pageState: {
        selectedIds: shapes.map((shape) => shape.id),
      },
    },
  }
}
