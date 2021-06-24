import Command from './command'
import history from '../history'
import { Data } from 'types'
import {
  deepClone,
  getCurrentCamera,
  getPage,
  getSelectedShapes,
  setSelectedIds,
} from 'utils'
import { uniqueId } from 'utils'
import vec from 'utils/vec'

export default function duplicateCommand(data: Data): void {
  const selectedShapes = getSelectedShapes(data).map(deepClone)

  const duplicates = selectedShapes.map((shape) => ({
    ...shape,
    id: uniqueId(),
    point: vec.add(shape.point, vec.div([16, 16], getCurrentCamera(data).zoom)),
    isGenerated: false,
  }))

  history.execute(
    data,
    new Command({
      name: 'duplicate_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = getPage(data)

        for (const duplicate of duplicates) {
          shapes[duplicate.id] = duplicate
        }

        setSelectedIds(
          data,
          duplicates.map((d) => d.id)
        )
      },
      undo(data) {
        const { shapes } = getPage(data)

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
