/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLBoundsCorner, Utils } from '@tldraw/core'
import { StretchType, TLDrawShapeType } from '~types'
import type { Data, TLDrawCommand } from '~types'
import { TLDR } from '~state/tldr'

export function stretch(data: Data, ids: string[], type: StretchType): TLDrawCommand {
  const { currentPageId } = data.appState

  const initialShapes = ids.map((id) => TLDR.getShape(data, id, currentPageId))

  const boundsForShapes = initialShapes.map((shape) => TLDR.getBounds(shape))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const idsToMutate = ids.flatMap((id) => {
    const shape = TLDR.getShape(data, id, currentPageId)
    return shape.children ? shape.children : shape.id
  })

  const { before, after } = TLDR.mutateShapes(
    data,
    idsToMutate,
    (shape) => {
      const bounds = TLDR.getBounds(shape)

      switch (type) {
        case StretchType.Horizontal: {
          const newBounds = {
            ...bounds,
            minX: commonBounds.minX,
            maxX: commonBounds.maxX,
            width: commonBounds.width,
          }

          return TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
            type: TLBoundsCorner.TopLeft,
            scaleX: newBounds.width / bounds.width,
            scaleY: 1,
            initialShape: shape,
            transformOrigin: [0.5, 0.5],
          })
        }
        case StretchType.Vertical: {
          const newBounds = {
            ...bounds,
            minY: commonBounds.minY,
            maxY: commonBounds.maxY,
            height: commonBounds.height,
          }

          return TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
            type: TLBoundsCorner.TopLeft,
            scaleX: 1,
            scaleY: newBounds.height / bounds.height,
            initialShape: shape,
            transformOrigin: [0.5, 0.5],
          })
        }
      }
    },
    currentPageId
  )

  initialShapes.forEach((shape) => {
    if (shape.type === TLDrawShapeType.Group) {
      delete before[shape.id]
      delete after[shape.id]
    }
  })

  return {
    id: 'stretch',
    before: {
      document: {
        pages: {
          [currentPageId]: { shapes: before },
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
