import { Utils, Vec } from '@tldraw/core'
import { Command, Data } from '../../state-types'
import { TLDR } from '../../tldr'

const PI2 = Math.PI * 2

export function rotate(data: Data, ids: string[], delta = -PI2 / 4): Command {
  const initialShapes = ids.map(id => data.page.shapes[id])

  const boundsForShapes = initialShapes.map(shape => {
    const utils = TLDR.getShapeUtils(shape)
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: utils.getBounds(shape),
      center: utils.getCenter(shape),
      rotation: shape.rotation,
    }
  })

  const commonBounds = Utils.getCommonBounds(boundsForShapes.map(({ bounds }) => bounds))
  const commonBoundsCenter = Utils.getBoundsCenter(commonBounds)

  const rotations = Object.fromEntries(
    boundsForShapes.map(({ id, point, center, rotation }) => {
      const offset = Vec.sub(center, point)
      const nextPoint = Vec.sub(Vec.rotWith(center, commonBoundsCenter, -(PI2 / 4)), offset)
      const nextRotation = (PI2 + ((rotation || 0) + delta)) % PI2

      return [id, { point: nextPoint, rotation: nextRotation }]
    })
  )

  const prevBoundsRotation = data.pageState.boundsRotation
  const nextBoundsRotation = (PI2 + ((data.pageState.boundsRotation || 0) + delta)) % PI2

  const { before, after } = TLDR.mutateShapes(data, ids, shape => rotations[shape.id])

  return {
    id: 'toggle_shapes',
    before: {
      page: {
        shapes: {
          ...before,
        },
      },
      pageState: {
        boundsRotation: prevBoundsRotation,
      },
    },
    after: {
      page: {
        shapes: {
          ...after,
        },
      },
      pageState: {
        boundsRotation: nextBoundsRotation,
      },
    },
  }
}
