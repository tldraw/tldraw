import Command from './command'
import history from '../history'
import { AlignType, Data } from 'types'
import { getCommonBounds, getPage, getSelectedShapes } from 'utils'
import { getShapeUtils } from 'state/shape-utils'

export default function alignCommand(data: Data, type: AlignType): void {
  const selectedShapes = getSelectedShapes(data)
  const entries = selectedShapes.map(
    (shape) => [shape.id, getShapeUtils(shape).getBounds(shape)] as const
  )
  const boundsForShapes = Object.fromEntries(entries)
  const commonBounds = getCommonBounds(...entries.map((entry) => entry[1]))
  const midX = commonBounds.minX + commonBounds.width / 2
  const midY = commonBounds.minY + commonBounds.height / 2

  history.execute(
    data,
    new Command({
      name: 'aligned',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)

        switch (type) {
          case AlignType.Top: {
            for (const id in boundsForShapes) {
              const shape = shapes[id]
              getShapeUtils(shape).translateTo(shape, [
                shape.point[0],
                commonBounds.minY,
              ])
            }
            break
          }
          case AlignType.CenterVertical: {
            for (const id in boundsForShapes) {
              const shape = shapes[id]
              getShapeUtils(shape).translateTo(shape, [
                shape.point[0],
                midY - boundsForShapes[id].height / 2,
              ])
            }
            break
          }
          case AlignType.Bottom: {
            for (const id in boundsForShapes) {
              const shape = shapes[id]
              getShapeUtils(shape).translateTo(shape, [
                shape.point[0],
                commonBounds.maxY - boundsForShapes[id].height,
              ])
            }
            break
          }
          case AlignType.Left: {
            for (const id in boundsForShapes) {
              const shape = shapes[id]
              getShapeUtils(shape).translateTo(shape, [
                commonBounds.minX,
                shape.point[1],
              ])
            }
            break
          }
          case AlignType.CenterHorizontal: {
            for (const id in boundsForShapes) {
              const shape = shapes[id]
              getShapeUtils(shape).translateTo(shape, [
                midX - boundsForShapes[id].width / 2,
                shape.point[1],
              ])
            }
            break
          }
          case AlignType.Right: {
            for (const id in boundsForShapes) {
              const shape = shapes[id]
              getShapeUtils(shape).translateTo(shape, [
                commonBounds.maxX - boundsForShapes[id].width,
                shape.point[1],
              ])
            }
            break
          }
        }
      },
      undo(data) {
        const { shapes } = getPage(data)
        for (const id in boundsForShapes) {
          const shape = shapes[id]
          const initialBounds = boundsForShapes[id]
          getShapeUtils(shape).translateTo(shape, [
            initialBounds.minX,
            initialBounds.minY,
          ])
        }
      },
    })
  )
}
