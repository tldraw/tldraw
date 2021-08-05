import { TLBoundsCorner, Utils } from '@tldraw/core'
import { StretchType } from '../../../types'
import { Data, Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function stretch(data: Data, ids: string[], type: StretchType): Command {
  const initialShapes = ids.map(id => data.page.shapes[id])

  const boundsForShapes = initialShapes.map(shape => TLDR.getBounds(shape))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const { before, after } = TLDR.mutateShapes(data, ids, shape => {
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
  })

  return {
    id: 'stretch_shapes',
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
