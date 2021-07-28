import { Vec } from '@tldraw/core'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function nudge(data: Data, delta: number[]) {
  const ids = [...TLD.getSelectedIds(data)]

  const shapesToNudge = ids
    .flatMap((id) => TLD.getDocumentBranch(data, id))
    .map((id) => {
      const shape = data.page.shapes[id]
      return {
        id,
        prev: { point: [...shape.point] },
        next: { point: Vec.add(shape.point, delta) },
      }
    })

  return new Command({
    name: 'nudge_shapes',
    category: 'canvas',
    manualSelection: true,
    do(data) {
      const { shapes } = data.page

      for (const { id, next } of shapesToNudge) {
        const shape = shapes[id]

        TLD.getShapeUtils(shape).mutate(shape, { ...next })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { shapes } = data.page

      for (const { id, prev } of shapesToNudge) {
        const shape = shapes[id]
        TLD.getShapeUtils(shape).mutate(shape, { ...prev })
      }

      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
