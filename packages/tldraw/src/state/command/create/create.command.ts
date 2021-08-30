import type { Patch } from 'rko'
import { TLDR } from '~state/tldr'
import type { TLDrawShape, Data, TLDrawCommand } from '~types'

export function create(data: Data, shapes: TLDrawShape[]): TLDrawCommand {
  const { currentPageId } = data.appState
  const beforeShapes: Record<string, Patch<TLDrawShape> | undefined> = {}
  const afterShapes: Record<string, Patch<TLDrawShape> | undefined> = {}

  shapes.forEach((shape) => {
    beforeShapes[shape.id] = undefined
    afterShapes[shape.id] = shape
  })

  return {
    id: 'toggle_shapes',
    before: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: beforeShapes,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: [...TLDR.getSelectedIds(data, currentPageId)],
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: afterShapes,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: shapes.map((shape) => shape.id),
          },
        },
      },
    },
  }
}
