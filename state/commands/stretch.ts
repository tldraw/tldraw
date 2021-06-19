import Command from './command'
import history from '../history'
import { StretchType, Data, Edge, Corner } from 'types'
import { getCommonBounds, getPage, getSelectedShapes } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import { current } from 'immer'

export default function stretchCommand(data: Data, type: StretchType) {
  const { currentPageId } = data
  const initialShapes = getSelectedShapes(current(data))
  const entries = initialShapes.map(
    (shape) => [shape.id, getShapeUtils(shape).getBounds(shape)] as const
  )
  const boundsForShapes = Object.fromEntries(entries)
  const commonBounds = getCommonBounds(...entries.map((entry) => entry[1]))

  history.execute(
    data,
    new Command({
      name: 'stretched_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        switch (type) {
          case StretchType.Horizontal: {
            for (let id in boundsForShapes) {
              const initialShape = initialShapes[id]
              const shape = shapes[id]
              const oldBounds = boundsForShapes[id]
              const newBounds = { ...oldBounds }
              newBounds.minX = commonBounds.minX
              newBounds.width = commonBounds.width
              newBounds.maxX = commonBounds.maxX

              getShapeUtils(shape).transform(shape, newBounds, {
                type: Corner.TopLeft,
                scaleX: newBounds.width / oldBounds.width,
                scaleY: 1,
                initialShape,
                transformOrigin: [0.5, 0.5],
              })
            }
            break
          }
          case StretchType.Vertical: {
            for (let id in boundsForShapes) {
              const initialShape = initialShapes[id]
              const shape = shapes[id]
              const oldBounds = boundsForShapes[id]
              const newBounds = { ...oldBounds }
              newBounds.minY = commonBounds.minY
              newBounds.height = commonBounds.height
              newBounds.maxY = commonBounds.maxY

              getShapeUtils(shape).transform(shape, newBounds, {
                type: Corner.TopLeft,
                scaleX: 1,
                scaleY: newBounds.height / oldBounds.height,
                initialShape,
                transformOrigin: [0.5, 0.5],
              })
            }
          }
        }
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)
        for (let id in boundsForShapes) {
          const shape = shapes[id]
          const initialShape = initialShapes[id]
          const initialBounds = boundsForShapes[id]
          getShapeUtils(shape).transform(shape, initialBounds, {
            type: Corner.BottomRight,
            scaleX: 1,
            scaleY: 1,
            initialShape,
            transformOrigin: [0.5, 0.5],
          })
        }
      },
    })
  )
}
