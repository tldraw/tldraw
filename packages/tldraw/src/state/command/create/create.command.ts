import type { DeepPartial } from '~../../core/dist/types/utils/utils'
import { TLDR } from '~state/tldr'
import type { TLDrawShape, Data, Command } from '~types'

export function create(data: Data, shapes: TLDrawShape[]): Command {
  const beforeShapes: Record<string, DeepPartial<TLDrawShape> | undefined> = {}
  const afterShapes: Record<string, DeepPartial<TLDrawShape> | undefined> = {}

  shapes.forEach((shape) => {
    beforeShapes[shape.id] = undefined
    afterShapes[shape.id] = shape
  })

  return {
    id: 'toggle_shapes',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: beforeShapes,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            selectedIds: [...TLDR.getSelectedIds(data)],
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: afterShapes,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            selectedIds: shapes.map((shape) => shape.id),
          },
        },
      },
    },
  }
}
