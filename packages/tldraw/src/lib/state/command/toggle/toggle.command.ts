// Used when changing the properties of one or more shapes,
// without changing selection or deleting any shapes.

import { getShapeUtils, PropsOfType, TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function toggle(data: Data, prop: PropsOfType<TLDrawShape, boolean>) {
  const ids = [...TLD.getSelectedIds(data)]
  const initialShapes = ids.map((id) => data.page.shapes[id])
  const isAllToggled = initialShapes.every((shape) => shape[prop])

  const shapesToToggle = ids.map((id) => {
    const shape = data.page.shapes[id]

    return {
      id,
      prev: { [prop]: shape[prop] },
      next: { [prop]: !isAllToggled },
    }
  })

  return new Command({
    name: 'toggle_shapes',
    category: 'canvas',
    manualSelection: true,
    do(data) {
      const { shapes } = data.page

      for (const { id, next } of shapesToToggle) {
        const shape = shapes[id]

        getShapeUtils(shape).mutate(shape, { ...next })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToToggle) {
        const shape = shapes[id]

        getShapeUtils(shape).mutate(shape, { ...prev })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
