import { FlipType, TDShape } from '~types'
import { TLBounds, TLBoundsCorner, Utils } from '@tldraw/core'
import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'
import { TLDR } from '~state/TLDR'

export function flipShapes(app: TldrawApp, ids: string[], type: FlipType): TldrawCommand {
  const {
    selectedIds,
    currentPageId,
    page: { shapes },
  } = app

  const boundsForShapes = ids.map((id) => TLDR.getBounds(shapes[id]))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const { before, after } = TLDR.mutateShapes(
    app.state,
    ids,
    (shape) => {
      if (ids.length === 1 && shape.type === 'group') {
        let flipRes: Partial<TDShape> = {}
        shape.children.forEach((shapeId) => {
          const childShape = shapes[shapeId]
          const childBoundForShape = TLDR.getBounds(childShape)
          const childCommonBounds = Utils.getCommonBounds([childBoundForShape])
          const childShapeBounds = TLDR.getBounds(childShape)
          flipRes = flipShape(type, childCommonBounds, childShapeBounds, childShape)
        })
        return flipRes
      } else {
        const shapeBounds = TLDR.getBounds(shape)
        return flipShape(type, commonBounds, shapeBounds, shape)
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

function flipShape(type: FlipType, commonBounds: TLBounds, shapeBounds: TLBounds, shape: TDShape) {
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
}
