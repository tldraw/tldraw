import { Utils, Vec } from '@tldraw/core'
import { TLDR } from '~state/tldr'
import type { Data, TLDrawCommand } from '~types'

export function duplicate(data: Data, ids: string[]): TLDrawCommand {
  const { currentPageId } = data.appState
  const delta = Vec.div([16, 16], TLDR.getCamera(data, currentPageId).zoom)

  const after = Object.fromEntries(
    TLDR.getSelectedIds(data, currentPageId)
      .map((id) => TLDR.getShape(data, id, currentPageId))
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
          [currentPageId]: { shapes: before },
        },
        pageStates: {
          [currentPageId]: { selectedIds: ids },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: { shapes: after },
        },
        pageStates: {
          [currentPageId]: { selectedIds: Object.keys(after) },
        },
      },
    },
  }
}
