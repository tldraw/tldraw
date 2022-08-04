import { Decoration } from '~types'
import type { Patch, ArrowShape, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

export function toggleShapesDecoration(
  app: TldrawApp,
  ids: string[],
  decorationId: 'start' | 'end'
): TldrawCommand {
  const { currentPageId, selectedIds } = app

  const beforeShapes: Record<string, Patch<ArrowShape>> = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        decorations: {
          [decorationId]: app.getShape<ArrowShape>(id).decorations?.[decorationId],
        },
      },
    ])
  )

  const afterShapes: Record<string, Patch<ArrowShape>> = Object.fromEntries(
    ids
      .filter((id) => !app.getShape(id).isLocked)
      .map((id) => [
        id,
        {
          decorations: {
            [decorationId]: app.getShape<ArrowShape>(id).decorations?.[decorationId]
              ? undefined
              : Decoration.Arrow,
          },
        },
      ])
  )

  return {
    id: 'toggle_decorations',
    before: {
      document: {
        pages: {
          [currentPageId]: { shapes: beforeShapes },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: { shapes: afterShapes },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
          },
        },
      },
    },
  }
}
