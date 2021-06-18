import Command from './command'
import history from '../history'
import { Data, DistributeType } from 'types'
import {
  getBoundsCenter,
  getCommonBounds,
  getPage,
  getSelectedShapes,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

export default function distributeCommand(data: Data, type: DistributeType) {
  const { currentPageId } = data

  const selectedShapes = getSelectedShapes(data).filter(
    (shape) => !shape.isLocked
  )

  const entries = selectedShapes.map(
    (shape) => [shape.id, getShapeUtils(shape).getBounds(shape)] as const
  )

  const boundsForShapes = Object.fromEntries(entries)

  const commonBounds = getCommonBounds(...entries.map((entry) => entry[1]))

  const centers = Object.fromEntries(
    selectedShapes.map((shape) => [
      shape.id,
      getBoundsCenter(boundsForShapes[shape.id]),
    ])
  )

  history.execute(
    data,
    new Command({
      name: 'distributed',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data, currentPageId)
        const len = entries.length

        switch (type) {
          case DistributeType.Horizontal: {
            const span = entries.reduce((a, c) => a + c[1].width, 0)

            if (span > commonBounds.width) {
              const left = entries.sort((a, b) => a[1].minX - b[1].minX)[0]

              const right = entries.sort((a, b) => b[1].maxX - a[1].maxX)[0]

              const entriesToMove = entries
                .filter((a) => a !== left && a !== right)
                .sort((a, b) => centers[a[0]][0] - centers[b[0]][0])

              const step =
                (centers[right[0]][0] - centers[left[0]][0]) / (len - 1)

              const x = centers[left[0]][0] + step

              for (let i = 0; i < entriesToMove.length; i++) {
                const [id, bounds] = entriesToMove[i]
                const shape = shapes[id]
                getShapeUtils(shape).translateTo(shape, [
                  x + step * i - bounds.width / 2,
                  bounds.minY,
                ])
              }
            } else {
              const entriesToMove = entries.sort(
                (a, b) => centers[a[0]][0] - centers[b[0]][0]
              )

              let x = commonBounds.minX
              const step = (commonBounds.width - span) / (len - 1)

              for (let i = 0; i < entriesToMove.length - 1; i++) {
                const [id, bounds] = entriesToMove[i]
                const shape = shapes[id]
                getShapeUtils(shape).translateTo(shape, [x, bounds.minY])
                x += bounds.width + step
              }
            }
            break
          }
          case DistributeType.Vertical: {
            const span = entries.reduce((a, c) => a + c[1].height, 0)

            if (span > commonBounds.height) {
              const top = entries.sort((a, b) => a[1].minY - b[1].minY)[0]

              const bottom = entries.sort((a, b) => b[1].maxY - a[1].maxY)[0]

              const entriesToMove = entries
                .filter((a) => a !== top && a !== bottom)
                .sort((a, b) => centers[a[0]][1] - centers[b[0]][1])

              const step =
                (centers[bottom[0]][1] - centers[top[0]][1]) / (len - 1)

              const y = centers[top[0]][1] + step

              for (let i = 0; i < entriesToMove.length; i++) {
                const [id, bounds] = entriesToMove[i]
                const shape = shapes[id]
                getShapeUtils(shape).translateTo(shape, [
                  bounds.minX,
                  y + step * i - bounds.height / 2,
                ])
              }
            } else {
              const entriesToMove = entries.sort(
                (a, b) => centers[a[0]][1] - centers[b[0]][1]
              )

              let y = commonBounds.minY
              const step = (commonBounds.height - span) / (len - 1)

              for (let i = 0; i < entriesToMove.length - 1; i++) {
                const [id, bounds] = entriesToMove[i]
                const shape = shapes[id]
                getShapeUtils(shape).translateTo(shape, [bounds.minX, y])
                y += bounds.height + step
              }
            }

            break
          }
        }
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)
        for (let id in boundsForShapes) {
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
