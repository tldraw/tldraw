import { AlignType, Utils } from '@tldraw/core'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function align(data: Data, type: AlignType) {
  const ids = [...TLD.getSelectedIds(data)]
  const initialShapes = ids.map((id) => data.page.shapes[id])

  const boundsForShapes = initialShapes.map((shape) => {
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: TLD.getShapeUtils(shape).getBounds(shape),
    }
  })

  const commonBounds = Utils.getCommonBounds(boundsForShapes.map(({ bounds }) => bounds))

  const midX = commonBounds.minX + commonBounds.width / 2
  const midY = commonBounds.minY + commonBounds.height / 2

  const shapesToTranslate = boundsForShapes.map(({ id, point, bounds }) => {
    switch (type) {
      case AlignType.Top: {
        return { id, prev: point, next: [point[0], commonBounds.minY] }
      }
      case AlignType.CenterVertical: {
        return { id, prev: point, next: [point[0], midY - bounds.height / 2] }
      }
      case AlignType.Bottom: {
        return { id, prev: point, next: [point[0], commonBounds.maxY - bounds.height] }
      }
      case AlignType.Left: {
        return { id, prev: point, next: [commonBounds.minX, point[1]] }
      }
      case AlignType.CenterHorizontal: {
        return { id, prev: point, next: [midX - bounds.width / 2, point[1]] }
      }
      case AlignType.Right: {
        return { id, prev: point, next: [commonBounds.maxX - bounds.width, point[1]] }
      }
    }
  })

  return new Command({
    name: 'align_shapes',
    category: 'canvas',
    do(data) {
      const { shapes } = data.page

      for (const { id, next } of shapesToTranslate) {
        const shape = shapes[id]

        TLD.getShapeUtils(shape).mutate(shape, { point: next })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToTranslate) {
        const shape = shapes[id]

        TLD.getShapeUtils(shape).mutate(shape, { point: prev })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
