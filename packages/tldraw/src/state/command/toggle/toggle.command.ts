import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function toggle(data: Data, ids: string[], prop: keyof TLDrawShape): Command {
  const { currentPageId } = data.appState
  const initialShapes = ids.map((id) => TLDR.getShape(data, id, currentPageId))
  const isAllToggled = initialShapes.every((shape) => shape[prop])

  const { before, after } = TLDR.mutateShapes(
    data,
    TLDR.getSelectedIds(data, currentPageId),
    () => ({
      [prop]: !isAllToggled,
    }),
    currentPageId
  )

  return {
    id: 'toggle_shapes',
    before: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: before,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: after,
          },
        },
      },
    },
  }
}
