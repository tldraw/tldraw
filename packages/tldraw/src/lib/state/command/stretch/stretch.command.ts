import { StretchType, TLBoundsCorner, Utils } from '@tldraw/core'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function stretch(data: Data, type: StretchType) {
  const ids = [...TLD.getSelectedIds(data)]
  const initialShapes = ids.map((id) => data.page.shapes[id])

  const boundsForShapes = initialShapes.map((shape) => {
    return {
      id: shape.id,
      shape: Utils.deepClone(shape),
      bounds: TLD.getShapeUtils(shape).getBounds(shape),
    }
  })

  const commonBounds = Utils.getCommonBounds(boundsForShapes.map(({ bounds }) => bounds))

  const shapesToTranslate = boundsForShapes.map(({ id, shape, bounds }) => {
    switch (type) {
      case StretchType.Horizontal: {
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
          id,
          prev: shape,
          next,
        }
      }
      case StretchType.Vertical: {
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
          id,
          prev: shape,
          next,
        }
      }
    }
  })

  return new Command({
    name: 'stretch_shapes',
    category: 'canvas',
    do(data) {
      const { shapes } = data.page

      for (const { id, next } of shapesToTranslate) {
        const shape = shapes[id]

        TLD.getShapeUtils(shape).transform(shape, next.bounds, next.transform)
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToTranslate) {
        const shape = shapes[id]

        TLD.getShapeUtils(shape).mutate(shape, { ...prev })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
