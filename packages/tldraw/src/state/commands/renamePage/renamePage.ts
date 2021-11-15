import type { TLDrawCommand } from '~types'
import type { TLDrawApp } from '../../internal'

export function renamePage(app: TLDrawApp, pageId: string, name: string): TLDrawCommand {
  const { page } = app

  return {
    id: 'rename_page',
    before: {
      document: {
        pages: {
          [pageId]: { name: page.name },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: { name: name },
        },
      },
    },
  }
}
