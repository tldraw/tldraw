import type { Data, TLDrawCommand, PagePartial, TLDrawShape } from '~types'
import { TLDR } from '~state/tldr'

export function update(
  data: Data,
  updates: ({ id: string } & Partial<TLDrawShape>)[],
  pageId: string
): TLDrawCommand {
  const ids = updates.map((update) => update.id)

  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const change = TLDR.mutateShapes(data, ids, (_shape, i) => updates[i], pageId)

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
