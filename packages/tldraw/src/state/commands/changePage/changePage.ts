import type { TLDrawSnapshot, TLDrawCommand } from '~types'

export function changePage(data: TLDrawSnapshot, pageId: string): TLDrawCommand {
  return {
    id: 'change_page',
    before: {
      appState: {
        currentPageId: data.appState.currentPageId,
      },
    },
    after: {
      appState: {
        currentPageId: pageId,
      },
    },
  }
}
