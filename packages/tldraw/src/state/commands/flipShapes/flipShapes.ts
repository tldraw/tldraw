import { FlipType } from '~types'
import { TLBoundsCorner, Utils } from '@tldraw/core'
import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'
import { TLDR } from '~state/TLDR'

export function flipShapes(app: TldrawApp, ids: string[], type: FlipType): TldrawCommand {
  const { selectedIds, currentPageId, shapes } = app

  const boundsForShapes = shapes.map((shape) => TLDR.getBounds(shape))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const { before, after } = TLDR.mutateShapes(
    app.state,
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

          return TLDR.getShapeUtil(shape).transform(shape, newShapeBounds, {
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

          return TLDR.getShapeUtil(shape).transform(shape, newShapeBounds, {
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
          [currentPageId]: { shapes: before },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: { shapes: after },
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
