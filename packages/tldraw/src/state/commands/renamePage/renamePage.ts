import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

export function renamePage(app: TldrawApp, pageId: string, name: string): TldrawCommand {
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
