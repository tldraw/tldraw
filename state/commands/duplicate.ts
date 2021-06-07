import Command from './command'
import history from '../history'
import { Data } from 'types'
import {
  getCurrentCamera,
  getPage,
  getSelectedIds,
  getSelectedShapes,
  setSelectedIds,
} from 'utils/utils'
import { v4 as uuid } from 'uuid'
import { current } from 'immer'
import * as vec from 'utils/vec'

export default function duplicateCommand(data: Data) {
  const { currentPageId } = data
  const selectedShapes = getSelectedShapes(current(data))
  const duplicates = selectedShapes.map((shape) => ({
    ...shape,
    id: uuid(),
    point: vec.add(shape.point, vec.div([16, 16], getCurrentCamera(data).zoom)),
  }))

  history.execute(
    data,
    new Command({
      name: 'duplicate_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const duplicate of duplicates) {
          shapes[duplicate.id] = duplicate
        }

        setSelectedIds(
          data,
          duplicates.map((d) => d.id)
        )
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const duplicate of duplicates) {
          delete shapes[duplicate.id]
        }

        setSelectedIds(
          data,
          selectedShapes.map((d) => d.id)
        )
      },
    })
  )
}
