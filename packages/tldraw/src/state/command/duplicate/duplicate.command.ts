import { Utils, Vec } from '@tldraw/core'
import { TLDR } from '~state/tldr'
import type { Data, Command } from '~types'

export function duplicate(data: Data, ids: string[]): Command {
  const delta = Vec.div([16, 16], TLDR.getCamera(data).zoom)

  const after = Object.fromEntries(
    TLDR.getSelectedIds(data)
      .map((id) => TLDR.getShape(data, id))
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

  const before = Object.fromEntries(Object.keys(after).map((id) => [id, undefined]))

  return {
    id: 'duplicate',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: before },
        },
        pageStates: {
          [data.appState.currentPageId]: { selectedIds: ids },
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: after },
        },
        pageStates: {
          [data.appState.currentPageId]: { selectedIds: Object.keys(after) },
        },
      },
    },
  }
}
