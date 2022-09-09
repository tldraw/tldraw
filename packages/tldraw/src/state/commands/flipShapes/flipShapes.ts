import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import type { TldrawApp } from '~state/TldrawApp'
import { FlipType } from '~types'
import type { TldrawCommand } from '~types'

export function flipShapes(app: TldrawApp, ids: string[], type: FlipType): TldrawCommand {
  const {
    selectedIds,
    currentPageId,
    page: { shapes },
  } = app

  const boundsForShapes = ids.map((id) => TLDR.getBounds(shapes[id]))

  const isSinglySelectedGroup = ids.length === 1 && shapes[ids[0]].type === 'group'

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const { before, after } = TLDR.mutateShapes(
    app.state,
    ids,
    (shape) => {
      const shapeBounds = TLDR.getBounds(shape)
      const isChildOfGroup = shape.parentId !== currentPageId
      switch (type) {
        case FlipType.Horizontal: {
          if (isChildOfGroup && !isSinglySelectedGroup) {
            // do translation of this child
            const groupBounds = TLDR.getBounds(shapes[shape.parentId])
            const newGroupBounds = Utils.getRelativeTransformedBoundingBox(
              commonBounds,
              commonBounds,
              groupBounds,
              true,
              false
            )
            const dx = newGroupBounds.minX - groupBounds.minX
            return TLDR.getShapeUtil(shape).transform(
              shape,
              { ...shapeBounds, minX: shapeBounds.minX + dx, maxX: shapeBounds.maxX + dx },
              {
                type: TLBoundsCorner.TopLeft,
                scaleX: 1,
                scaleY: 1,
                initialShape: shape,
                transformOrigin: [0.5, 0.5],
              }
            )
          }

          const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
            commonBounds,
            commonBounds,
            shapeBounds,
            true,
            false
          )

          const res = TLDR.getShapeUtil(shape).transform(shape, newShapeBounds, {
            type: TLBoundsCorner.TopLeft,
            scaleX: -1,
            scaleY: 1,
            initialShape: shape,
            transformOrigin: [0.5, 0.5],
          })

          if (shape && shape.type === 'arrow') {
            const next = {
              ...res,
              handles: {
                ...res.handles,
                bend: shape.handles?.bend,
              },
            }
            return next as any
          }
          return res
        }
        case FlipType.Vertical: {
          if (isChildOfGroup && !isSinglySelectedGroup) {
            // do translation of this child
            const groupBounds = TLDR.getBounds(shapes[shape.parentId])
            const newGroupBounds = Utils.getRelativeTransformedBoundingBox(
              commonBounds,
              commonBounds,
              groupBounds,
              false,
              true
            )
            const dy = newGroupBounds.minY - groupBounds.minY
            return TLDR.getShapeUtil(shape).transform(
              shape,
              { ...shapeBounds, minY: shapeBounds.minY + dy, maxY: shapeBounds.maxY + dy },
              {
                type: TLBoundsCorner.TopLeft,
                scaleX: 1,
                scaleY: 1,
                initialShape: shape,
                transformOrigin: [0.5, 0.5],
              }
            )
          }
          const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
            commonBounds,
            commonBounds,
            shapeBounds,
            false,
            true
          )

          const res = TLDR.getShapeUtil(shape).transform(shape, newShapeBounds, {
            type: TLBoundsCorner.TopLeft,
            scaleX: 1,
            scaleY: -1,
            initialShape: shape,
            transformOrigin: [0.5, 0.5],
          })

          return res
        }
      }
    },
    currentPageId,
    true
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
