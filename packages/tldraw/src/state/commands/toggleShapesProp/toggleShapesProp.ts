import type { TDShape, TldrawCommand } from '~types'
import { TLDR } from '~state/TLDR'
import type { TldrawApp } from '~state'

export function toggleShapeProp(app: TldrawApp, ids: string[], prop: keyof TDShape): TldrawCommand {
  const { currentPageId } = app

  const initialShapes = ids.map((id) => app.getShape(id))

  const isAllToggled = initialShapes.every((shape) => shape[prop])

  const { before, after } = TLDR.mutateShapes(
    app.state,
    ids.filter((id) => (prop === 'isLocked' ? true : !app.getShape(id).isLocked)),
    () => ({
      [prop]: !isAllToggled,
    }),
    currentPageId
  )

  return {
    id: 'toggle',
    before: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: before,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
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
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
          },
        },
      },
    },
  }
}
