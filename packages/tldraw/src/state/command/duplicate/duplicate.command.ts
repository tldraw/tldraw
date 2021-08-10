import { Utils, Vec } from '@tldraw/core'
import { TLDR } from '../../tldr'
import type { Data, Command } from '../../state-types'

export function duplicate(data: Data, ids: string[]): Command {
  const delta = Vec.div([16, 16], data.pageState.camera.zoom)

  const after = Object.fromEntries(
    TLDR.getSelectedIds(data)
      .map((id) => data.page.shapes[id])
      .map((shape) => {
        const id = Utils.uniqueId()
        return [
          id,
          {
            ...Utils.deepClone(shape),
            id,
            point: Vec.round(Vec.add(shape.point, delta)),
          },
        ]
      })
  )

  const before = Object.fromEntries(
    Object.keys(after).map((id) => [id, undefined])
  )

  return {
    id: 'duplicate',
    before: {
      page: {
        shapes: {
          ...before,
        },
      },
      pageState: {
        ...data.pageState,
        selectedIds: ids,
      },
    },
    after: {
      page: {
        shapes: {
          ...after,
        },
      },
      pageState: {
        ...data.pageState,
        selectedIds: Object.keys(after),
      },
    },
  }
}
