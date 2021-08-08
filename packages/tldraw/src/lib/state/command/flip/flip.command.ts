import { FlipType } from './../../../types'
import { TLBoundsCorner, Utils } from '@tldraw/core'
import { Data, Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function flip(data: Data, ids: string[], type: FlipType): Command {
  const initialShapes = ids.map((id) => data.page.shapes[id])

  const boundsForShapes = initialShapes.map((shape) => TLDR.getBounds(shape))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const { before, after } = TLDR.mutateShapes(data, ids, (shape) => {
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
  })

  return {
    id: 'flip_shapes',
    before: {
      page: {
        shapes: {
          ...before,
        },
      },
    },
    after: {
      page: {
        shapes: {
          ...after,
        },
      },
    },
  }
}
