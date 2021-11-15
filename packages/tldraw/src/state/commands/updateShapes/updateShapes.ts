import type { TLDrawCommand, TLDrawShape } from '~types'
import { TLDR } from '~state/TLDR'
import type { TLDrawApp } from '../../internal'

export function update(
  app: TLDrawApp,
  updates: ({ id: string } & Partial<TLDrawShape>)[],
  pageId: string
): TLDrawCommand {
  const ids = updates.map((update) => update.id)

  const change = TLDR.mutateShapes(
    app.state,
    ids.filter((id) => !app.getShape(id, pageId).isLocked),
    (_shape, i) => updates[i],
    pageId
  )

  return {
    id: 'update',
    before: {
      document: {
        pages: {
          [pageId]: {
            shapes: change.before,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: {
            shapes: change.after,
          },
        },
      },
    },
  }
}
