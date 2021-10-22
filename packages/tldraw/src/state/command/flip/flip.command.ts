import { FlipType } from '~types'
import { TLBoundsCorner, Utils } from '@tldraw/core'
import type { Data, TLDrawCommand } from '~types'
import { TLDR } from '~state/tldr'

export function flip(data: Data, ids: string[], type: FlipType): TLDrawCommand {
  const { currentPageId } = data.appState
  const initialShapes = ids.map((id) => TLDR.getShape(data, id, currentPageId))

  const boundsForShapes = initialShapes.map((shape) => TLDR.getBounds(shape))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const { before, after } = TLDR.mutateShapes(
    data,
    ids,
    (shape) => {
      const shapeBounds = TLDR.getBounds(shape)

      switch (type) {
        case FlipType.Horizontal: {
          const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
            commonBounds,
            commonBounds,
            shapeBounds,
            true,
            false
          )

          return TLDR.getShapeUtils(shape).transform(shape, newShapeBounds, {
            type: TLBoundsCorner.TopLeft,
            scaleX: -1,
            scaleY: 1,
            initialShape: shape,
            transformOrigin: [0.5, 0.5],
          })
        }
        case FlipType.Vertical: {
          const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
            commonBounds,
            commonBounds,
            shapeBounds,
            false,
            true
          )

          return TLDR.getShapeUtils(shape).transform(shape, newShapeBounds, {
            type: TLBoundsCorner.TopLeft,
            scaleX: 1,
            scaleY: -1,
            initialShape: shape,
            transformOrigin: [0.5, 0.5],
          })
        }
      }
    },
    currentPageId
  )

  return {
    id: 'flip',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: before },
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
          [data.appState.currentPageId]: { shapes: after },
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
