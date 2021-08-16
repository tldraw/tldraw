import { Decoration } from '~types'
import type { ArrowShape, Command, Data } from '~types'
import { TLDR } from '~state/tldr'

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
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: before },
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: after },
        },
      },
    },
  }
}
