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
import { uniqueId } from 'utils/utils'
import { current } from 'immer'
import vec from 'utils/vec'

export default function duplicateCommand(data: Data) {
  const { currentPageId } = data
  const selectedShapes = getSelectedShapes(current(data))
  const duplicates = selectedShapes.map((shape) => ({
    ...shape,
    id: uniqueId(),
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
