import { Decoration } from '~types'
import type { ArrowShape, TLDrawCommand, Data } from '~types'
import { TLDR } from '~state/TLDR'
import type { Patch } from 'rko'

export function toggleDecoration(
  data: Data,
  ids: string[],
  decorationId: 'start' | 'end'
): TLDrawCommand {
  const { currentPageId } = data.appState

  const beforeShapes: Record<string, Patch<ArrowShape>> = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        decorations: {
          [decorationId]: TLDR.getShape<ArrowShape>(data, id, currentPageId).decorations?.[
            decorationId
          ],
        },
      },
    ])
  )

  const afterShapes: Record<string, Patch<ArrowShape>> = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        decorations: {
          [decorationId]: TLDR.getShape<ArrowShape>(data, id, currentPageId).decorations?.[
            decorationId
          ]
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
            selectedIds: ids,
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
