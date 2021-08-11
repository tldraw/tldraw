import { Decoration } from '../../../shape'
import type { ArrowShape } from '../../../shape'
import type { Command, Data } from '../../state-types'
import { TLDR } from '../../tldr'

export function toggleDecoration(data: Data, ids: string[], handleId: 'start' | 'end'): Command {
  const { before, after } = TLDR.mutateShapes<ArrowShape>(data, ids, (shape) => {
    const decorations = shape.decorations
      ? {
          ...shape.decorations,
          [handleId]: shape.decorations[handleId] ? undefined : Decoration.Arrow,
        }
      : {
          [handleId]: Decoration.Arrow,
        }

    return {
      decorations,
    }
  })

  return {
    id: 'toggle_decorations',
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
