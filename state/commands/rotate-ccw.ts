import Command from './command'
import history from '../history'
import { Data } from 'types'
import {
  getBoundsCenter,
  getCommonBounds,
  getPage,
  getSelectedShapes,
} from 'utils'
import vec from 'utils/vec'
import { getShapeUtils } from 'state/shape-utils'

const PI2 = Math.PI * 2

export default function rotateCcwCommand(data: Data): void {
  const { currentPageId, boundsRotation } = data

  const page = getPage(data)

  const initialShapes = Object.fromEntries(
    getSelectedShapes(data).map((shape) => {
      const bounds = getShapeUtils(shape).getBounds(shape)
      return [
        shape.id,
        {
          rotation: shape.rotation,
          point: [...shape.point],
          center: getBoundsCenter(bounds),
          bounds,
        },
      ]
    })
  )

  const commonBoundsCenter = getBoundsCenter(
    getCommonBounds(...Object.values(initialShapes).map((b) => b.bounds))
  )

  const nextShapes = Object.fromEntries(
    Object.entries(initialShapes).map(([id, { point, center }]) => {
      const shape = { ...page.shapes[id] }
      const offset = vec.sub(center, point)
      const nextPoint = vec.sub(
        vec.rotWith(center, commonBoundsCenter, -(PI2 / 4)),
        offset
      )

      const rot = (PI2 + (shape.rotation - PI2 / 4)) % PI2

      getShapeUtils(shape)
        .setProperty(shape, 'rotation', rot)
        .setProperty(shape, 'point', nextPoint)

      return [id, shape]
    })
  )

  const nextboundsRotation = (PI2 + (data.boundsRotation - PI2 / 4)) % PI2

  history.execute(
    data,
    new Command({
      name: 'rotate_ccw',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const id in nextShapes) {
          const shape = shapes[id]
          if (shape.isLocked) continue

          getShapeUtils(shape)
            .setProperty(shape, 'rotation', nextShapes[id].rotation)
            .setProperty(shape, 'point', nextShapes[id].point)
        }

        data.boundsRotation = nextboundsRotation
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const id in initialShapes) {
          const { point, rotation } = initialShapes[id]

          const shape = shapes[id]

          if (shape.isLocked) continue

          const utils = getShapeUtils(shape)
          utils
            .setProperty(shape, 'rotation', rotation)
            .setProperty(shape, 'point', point)
        }

        data.boundsRotation = boundsRotation
      },
    })
  )
}
