import Command from './command'
import history from '../history'
import { Data } from 'types'
import { deepClone } from 'utils'
import tld from 'utils/tld'
import { uniqueId } from 'utils'
import vec from 'utils/vec'

export default function duplicateCommand(data: Data): void {
  const selectedShapes = tld.getSelectedShapes(data).map(deepClone)

  const duplicates = selectedShapes.map((shape) => ({
    ...shape,
    id: uniqueId(),
    point: vec.add(
      shape.point,
      vec.div([16, 16], tld.getCurrentCamera(data).zoom)
    ),
    isGenerated: false,
  }))

  history.execute(
    data,
    new Command({
      name: 'duplicate_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = tld.getPage(data)

        for (const duplicate of duplicates) {
          shapes[duplicate.id] = duplicate
        }

        tld.setSelectedIds(
          data,
          duplicates.map((d) => d.id)
        )
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        for (const duplicate of duplicates) {
          delete shapes[duplicate.id]
        }

        tld.setSelectedIds(
          data,
          selectedShapes.map((d) => d.id)
        )
      },
    })
  )
}
