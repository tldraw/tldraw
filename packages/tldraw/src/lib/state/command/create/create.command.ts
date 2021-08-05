import { TLDrawShape } from '../../../shape'
import { Data, Command } from '../../state-types'

export function create(data: Data, shapes: TLDrawShape[]): Command {
  return {
    id: 'toggle_shapes',
    before: {
      page: {
        shapes: Object.fromEntries(shapes.map(shape => [shape.id, undefined])),
      },
    },
    after: {
      page: {
        shapes: Object.fromEntries(shapes.map(shape => [shape.id, shape])),
      },
    },
  }
}
