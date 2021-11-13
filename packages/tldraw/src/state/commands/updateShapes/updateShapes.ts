import type { TLDrawSnapshot, TLDrawCommand, PagePartial, TLDrawShape } from '~types'
import { TLDR } from '~state/TLDR'

export function update(
  data: TLDrawSnapshot,
  updates: ({ id: string } & Partial<TLDrawShape>)[],
  pageId: string
): TLDrawCommand {
  const { currentPageId } = data.appState

  const ids = updates.map((update) => update.id)

  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const change = TLDR.mutateShapes(
    data,
    ids.filter((id) => !TLDR.getShape(data, id, currentPageId).isLocked),
    (_shape, i) => updates[i],
    pageId
  )

  before.shapes = change.before
  after.shapes = change.after

  return {
    id: 'update',
    before: {
      document: {
        pages: {
          [pageId]: before,
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: after,
        },
      },
    },
  }
}
