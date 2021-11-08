import type { TLDrawSnapshot, TLDrawCommand } from '~types'

export function renamePage(data: TLDrawSnapshot, pageId: string, name: string): TLDrawCommand {
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
