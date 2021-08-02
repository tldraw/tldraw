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
      bounds: TLD.getBounds(shape),
    }
  })

  const commonBounds = Utils.getCommonBounds(boundsForShapes.map(({ bounds }) => bounds))

  const midX = commonBounds.minX + commonBounds.width / 2
  const midY = commonBounds.minY + commonBounds.height / 2

  const shapesToTranslate = boundsForShapes.map(({ id, point, bounds }) => {
    return {
      [AlignType.CenterVertical]: { id, prev: point, next: [point[0], midY - bounds.height / 2] },
      [AlignType.CenterHorizontal]: { id, prev: point, next: [midX - bounds.width / 2, point[1]] },
      [AlignType.Top]: { id, prev: point, next: [point[0], commonBounds.minY] },
      [AlignType.Bottom]: { id, prev: point, next: [point[0], commonBounds.maxY - bounds.height] },
      [AlignType.Left]: { id, prev: point, next: [commonBounds.minX, point[1]] },
      [AlignType.Right]: { id, prev: point, next: [commonBounds.maxX - bounds.width, point[1]] },
    }[type]
  })

  return new Command({
    name: 'align_shapes',
    category: 'canvas',
    do(data) {
      const { shapes } = data.page

      for (const { id, next } of shapesToTranslate) {
        const shape = shapes[id]
        TLD.mutate(data, shape, { point: next })
      }
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToTranslate) {
        const shape = shapes[id]
        TLD.mutate(data, shape, { point: prev })
      }
    },
  })
}
