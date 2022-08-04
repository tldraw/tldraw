import type { TldrawCommand, TDShape } from '~types'
import { TLDR } from '~state/TLDR'
import type { TldrawApp } from '../../internal'

export function updateShapes(
  app: TldrawApp,
  updates: ({ id: string } & Partial<TDShape>)[],
  pageId: string
): TldrawCommand {
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
