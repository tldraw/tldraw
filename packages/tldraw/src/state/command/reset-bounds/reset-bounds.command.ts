import type { Data, TLDrawCommand } from '~types'
import { TLDR } from '~state/tldr'

export function resetBounds(data: Data, ids: string[], pageId: string): TLDrawCommand {
  const { before, after } = TLDR.mutateShapes(
    data,
    ids,
    (shape) => TLDR.getShapeUtils(shape).onBoundsReset(shape),
    pageId
  )

  return {
    id: 'reset_bounds',
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
