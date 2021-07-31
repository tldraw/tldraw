import { AlignType, Utils } from '@tldraw/core'
import { getShapeUtils } from 'packages/tldraw/src/lib/shape'
import { Data, Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function align(data: Data, type: AlignType): Command {
  const ids = [...TLDR.getSelectedIds(data)]
  const initialShapes = ids.map((id) => TLDR.getShape(data, id))

  const boundsForShapes = initialShapes.map((shape) => {
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: getShapeUtils(shape).getBounds(shape),
    }
  })

  const commonBounds = Utils.getCommonBounds(boundsForShapes.map(({ bounds }) => bounds))

  const midX = commonBounds.minX + commonBounds.width / 2
  const midY = commonBounds.minY + commonBounds.height / 2

  const deltas = Object.fromEntries(
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

  return {
    id: 'align_shapes',
    do(data) {
      return {
        ...data,
        page: {
          ...data.page,
          shapes: TLDR.mutateShapes(data, ids, (shape) => {
            return { point: deltas[shape.id].next }
          }),
        },
      }
    },
    undo(data) {
      return {
        ...data,
        page: {
          ...data.page,
          shapes: TLDR.mutateShapes(data, ids, (shape) => {
            return { point: deltas[shape.id].prev }
          }),
        },
      }
    },
  }
}
