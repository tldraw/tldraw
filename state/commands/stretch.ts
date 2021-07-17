import Command from './command'
import history from '../history'
import { StretchType, Data, Corner } from 'types'
import { deepClone, getCommonBounds } from 'utils'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import storage from 'state/storage'

export default function stretchCommand(data: Data, type: StretchType): void {
  const ids = tld.getSelectedIds(data)

  const initialShapes = tld
    .getSelectedShapes(data)
    .map((shape) => deepClone(shape))

  const snapshot = Object.fromEntries(
    initialShapes.map((shape) => [
      shape.id,
      {
        initialShape: shape,
        initialBounds: getShapeUtils(shape).getBounds(shape),
      },
    ])
  )

  const commonBounds = getCommonBounds(
    ...initialShapes.map((shape) => getShapeUtils(shape).getBounds(shape))
  )

  history.execute(
    data,
    new Command({
      name: 'stretched_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = tld.getPage(data)

        switch (type) {
          case StretchType.Horizontal: {
            Object.values(snapshot).forEach(
              ({ initialShape, initialBounds }) => {
                const newBounds = { ...initialBounds }
                newBounds.minX = commonBounds.minX
                newBounds.width = commonBounds.width
                newBounds.maxX = commonBounds.maxX

                const shape = shapes[initialShape.id]

                getShapeUtils(shape).transform(shape, newBounds, {
                  type: Corner.TopLeft,
                  scaleX: newBounds.width / initialBounds.width,
                  scaleY: 1,
                  initialShape,
                  transformOrigin: [0.5, 0.5],
                })
              }
            )

            break
          }
          case StretchType.Vertical: {
            Object.values(snapshot).forEach(
              ({ initialShape, initialBounds }) => {
                const newBounds = { ...initialBounds }
                newBounds.minY = commonBounds.minY
                newBounds.height = commonBounds.height
                newBounds.maxY = commonBounds.maxY

                const shape = shapes[initialShape.id]

                getShapeUtils(shape).transform(shape, newBounds, {
                  type: Corner.TopLeft,
                  scaleX: 1,
                  scaleY: newBounds.height / initialBounds.height,
                  initialShape,
                  transformOrigin: [0.5, 0.5],
                })
              }
            )
          }
        }

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)

        storage.savePage(data)
      },
      undo(data) {
        const { shapes } = tld.getPage(data)
        initialShapes.forEach((shape) => (shapes[shape.id] = shape))

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)

        storage.savePage(data)
      },
    })
  )
}
