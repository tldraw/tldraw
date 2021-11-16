import type { Patch } from 'rko'
import type { TldrawShape, TldrawCommand, TldrawBinding } from '~types'
import type { TldrawApp } from '../../internal'

export function createShapes(
  app: TldrawApp,
  shapes: TldrawShape[],
  bindings: TldrawBinding[] = []
): TldrawCommand {
  const { currentPageId } = app

  const beforeShapes: Record<string, Patch<TldrawShape> | undefined> = {}
  const afterShapes: Record<string, Patch<TldrawShape> | undefined> = {}

  shapes.forEach((shape) => {
    beforeShapes[shape.id] = undefined
    afterShapes[shape.id] = shape
  })

  const beforeBindings: Record<string, Patch<TldrawBinding> | undefined> = {}
  const afterBindings: Record<string, Patch<TldrawBinding> | undefined> = {}

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
