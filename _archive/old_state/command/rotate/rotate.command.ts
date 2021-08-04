import { Utils, Vec } from '@tldraw/core'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

const PI2 = Math.PI * 2

export function rotate(data: Data, delta = -PI2 / 4) {
  const ids = [...TLD.getSelectedIds(data)]
  const initialShapes = ids.map((id) => data.page.shapes[id])

  const boundsForShapes = initialShapes.map((shape) => {
    const utils = TLD.getShapeUtils(shape)
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

  const shapesToRotate = boundsForShapes.map(({ id, point, center, rotation = 0 }) => {
    const offset = Vec.sub(center, point)
    const nextPoint = Vec.sub(Vec.rotWith(center, commonBoundsCenter, -(PI2 / 4)), offset)
    const nextRotation = (PI2 + (rotation + delta)) % PI2

    return {
      id,
      prev: { point, rotation: rotation },
      next: { point: nextPoint, rotation: nextRotation },
    }
  })

  const prevBoundsRotation = data.pageState.boundsRotation
  const nextboundsRotation = (PI2 + ((data.pageState.boundsRotation || 0) + delta)) % PI2

  return new Command({
    name: 'rotated_shapes',
    category: 'canvas',
    do(data) {
      const { shapes } = data.page

      for (const { id, next } of shapesToRotate) {
        const shape = shapes[id]
        TLD.mutate(data, shape, next)
      }

      data.pageState.boundsRotation = nextboundsRotation

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToRotate) {
        const shape = shapes[id]
        TLD.mutate(data, shape, prev)
      }

      data.pageState.boundsRotation = prevBoundsRotation

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
