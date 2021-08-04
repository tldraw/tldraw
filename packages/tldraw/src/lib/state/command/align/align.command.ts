import { Utils } from '@tldraw/core'
import { AlignType } from '../../../types'
import { Data, Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function align(data: Data, ids: string[], type: AlignType): Command {
  const initialShapes = ids.map((id) => TLDR.getShape(data, id))

  const boundsForShapes = initialShapes.map((shape) => {
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: TLDR.getShapeUtils(shape).getBounds(shape),
    }
  })

  const commonBounds = Utils.getCommonBounds(boundsForShapes.map(({ bounds }) => bounds))

  const midX = commonBounds.minX + commonBounds.width / 2
  const midY = commonBounds.minY + commonBounds.height / 2

  const deltaMap = Object.fromEntries(
    boundsForShapes.map(({ id, point, bounds }) => {
      return [
        id,
        {
          prev: point,
          next: {
            [AlignType.CenterVertical]: [point[0], midY - bounds.height / 2],
            [AlignType.CenterHorizontal]: [midX - bounds.width / 2, point[1]],
            [AlignType.Top]: [point[0], commonBounds.minY],
            [AlignType.Bottom]: [point[0], commonBounds.maxY - bounds.height],
            [AlignType.Left]: [commonBounds.minX, point[1]],
            [AlignType.Right]: [commonBounds.maxX - bounds.width, point[1]],
          }[type],
        },
      ]
    }),
  )

  const { before, after } = TLDR.mutateShapes(data, ids, (shape) => {
    if (!deltaMap[shape.id]) return shape
    return { point: deltaMap[shape.id].next }
  })

  return {
    id: 'align_shapes',
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
