import { Data } from 'packages/tldraw/src/lib/types'
import { ShapeStyles } from '../../../shape'
import { Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function style(data: Data, changes: Partial<ShapeStyles>): Command {
  const ids = [...TLDR.getSelectedIds(data)]

  const { before, after } = TLDR.mutateShapes(data, ids, (shape) => {
    return { style: { ...shape.style, ...changes } }
  })

  return {
    id: 'style_shapes',
    before: {
      page: {
        shapes: {
          ...before,
        },
      },
    },
    after: {
      page: {
        shapes: {
          ...after,
        },
      },
    },
  }
}
