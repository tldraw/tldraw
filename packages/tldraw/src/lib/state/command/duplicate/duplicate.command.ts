import { Utils, Vec } from '@tldraw/core'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function duplicate(data: Data) {
  const ids = [...TLD.getSelectedIds(data)]

  const initialShapes = ids.map((id) => data.page.shapes[id])

  const duplicates = initialShapes.map((shape) => ({
    ...Utils.deepClone(shape),
    id: Utils.uniqueId(),
    point: Vec.add(shape.point, Vec.div([16, 16], data.pageState.camera.zoom)),
  }))

  const newIds = duplicates.map((shape) => shape.id)

  return new Command({
    name: 'duplicate_shapes',
    category: 'canvas',
    manualSelection: true,
    do(data) {
      const { shapes } = data.page

      duplicates.forEach((duplicate) => (shapes[duplicate.id] = duplicate))

      TLD.setSelectedIds(data, newIds)
      TLD.updateBindings(data, newIds)
      TLD.updateParents(data, newIds)
    },
    undo(data) {
      TLD.deleteShapes(data, newIds)
      TLD.setSelectedIds(data, ids)
    },
  })
}
