import { StretchType, TLBoundsCorner, Utils } from '@tldraw/core'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function stretch(data: Data, type: StretchType) {
  const ids = [...TLD.getSelectedIds(data)]
  const initialShapes = ids.map((id) => data.page.shapes[id])

  const boundsForShapes = initialShapes.map((shape) => TLD.getBounds(shape))

  const commonBounds = Utils.getCommonBounds(boundsForShapes)

  const shapesToTranslate = initialShapes.map((shape) => {
    const bounds = TLD.getBounds(shape)

    if (type === StretchType.Horizontal) {
      const newBounds = {
        ...bounds,
        minX: commonBounds.minX,
        maxX: commonBounds.maxX,
        width: commonBounds.width,
      }

      const next = {
        bounds: newBounds,
        transform: {
          type: TLBoundsCorner.TopLeft,
          scaleX: 1,
          scaleY: newBounds.height / bounds.height,
          initialShape: shape,
          transformOrigin: [0.5, 0.5],
        },
      }

      return {
        id: shape.id,
        prev: shape,
        next,
      }
    } else {
      const newBounds = {
        ...bounds,
        minY: commonBounds.minY,
        maxY: commonBounds.maxY,
        height: commonBounds.height,
      }

      const next = {
        bounds: newBounds,
        transform: {
          type: TLBoundsCorner.TopLeft,
          scaleX: 1,
          scaleY: newBounds.height / bounds.height,
          initialShape: shape,
          transformOrigin: [0.5, 0.5],
        },
      }

      return {
        id: shape.id,
        prev: Utils.deepClone(shape),
        next,
      }
    }
  })

  return new Command({
    name: 'stretch_shapes',
    category: 'canvas',
    do(data) {
      for (const { id, next } of shapesToTranslate) {
        const shape = data.page.shapes[id]
        TLD.transform(data, shape, next.bounds, next.transform)
      }
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToTranslate) {
        const shape = shapes[id]
        TLD.mutate(data, shape, { ...prev })
      }
    },
  })
}
