import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function toggle(data: Data, ids: string[], prop: keyof TLDrawShape): Command {
  const initialShapes = ids.map((id) => TLDR.getShape(data, id))
  const isAllToggled = initialShapes.every((shape) => shape[prop])

  const { before, after } = TLDR.mutateShapes(data, TLDR.getSelectedIds(data), () => ({
    [prop]: !isAllToggled,
  }))

  return {
    id: 'toggle_shapes',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: before,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: after,
          },
        },
      },
    },
  }
}
