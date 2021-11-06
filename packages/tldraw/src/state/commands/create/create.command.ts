import type { Patch } from 'rko'
import { TLDR } from '~state/TLDR'
import type { TLDrawShape, Data, TLDrawCommand, TLDrawBinding } from '~types'

export function create(
  data: Data,
  shapes: TLDrawShape[],
  bindings: TLDrawBinding[] = []
): TLDrawCommand {
  const { currentPageId } = data.appState

  const beforeShapes: Record<string, Patch<TLDrawShape> | undefined> = {}
  const afterShapes: Record<string, Patch<TLDrawShape> | undefined> = {}

  shapes.forEach((shape) => {
    beforeShapes[shape.id] = undefined
    afterShapes[shape.id] = shape
  })

  const beforeBindings: Record<string, Patch<TLDrawBinding> | undefined> = {}
  const afterBindings: Record<string, Patch<TLDrawBinding> | undefined> = {}

  bindings.forEach((binding) => {
    beforeBindings[binding.id] = undefined
    afterBindings[binding.id] = binding
  })

  return {
    id: 'create',
    before: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: beforeShapes,
            bindings: beforeBindings,
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
            bindings: afterBindings,
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
