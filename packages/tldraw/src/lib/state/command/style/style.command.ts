// Used when changing the properties of one or more shapes,
// without changing selection or deleting any shapes.

import { Utils } from '@tldraw/core'
import { getShapeUtils, ShapeStyles } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function style(data: Data, newStyle: Partial<ShapeStyles>) {
  const ids = TLD.getSelectedIds(data)

  const selectedIds = [...TLD.getSelectedIds(data)]

  const shapesToStyle = selectedIds
    .flatMap((id) => TLD.getDocumentBranch(data, id))
    .map((id) => ({ id, prevStyle: Utils.deepClone(data.page.shapes[id].style) }))

  return new Command({
    name: 'style_shapes',
    category: 'canvas',
    manualSelection: true,
    do(data) {
      const { shapes } = TLD.getPage(data)

      for (const { id } of shapesToStyle) {
        const shape = shapes[id]
        getShapeUtils(shape).mutate(shape, { style: { ...shape.style, ...newStyle } })
      }

      // TLD.updateBindings(data, ids)

      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { shapes } = TLD.getPage(data)

      for (const { id, prevStyle } of shapesToStyle) {
        const shape = shapes[id]
        getShapeUtils(shape).mutate(shape, { style: { ...shape.style, ...prevStyle } })
      }

      // TLD.updateBindings(data, ids)

      TLD.updateParents(data, ids)
    },
  })
}
