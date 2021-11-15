import type { Patch } from 'rko'
import type { TLDrawShape, TLDrawCommand, TLDrawBinding } from '~types'
import type { TLDrawApp } from '../../internal'

export function createShapes(
  app: TLDrawApp,
  shapes: TLDrawShape[],
  bindings: TLDrawBinding[] = []
): TLDrawCommand {
  const { currentPageId } = app

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
            selectedIds: [...app.selectedIds],
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
