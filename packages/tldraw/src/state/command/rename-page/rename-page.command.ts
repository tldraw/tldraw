import type { Data, Command } from '~types'

export function renamePage(data: Data, pageId: string, name: string): Command {
  const page = data.document.pages[pageId]
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
