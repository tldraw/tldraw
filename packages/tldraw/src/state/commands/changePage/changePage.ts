import type { TLDrawCommand } from '~types'
import type { TLDrawApp } from '../../internal'

export function changePage(app: TLDrawApp, pageId: string): TLDrawCommand {
  return {
    id: 'change_page',
    before: {
      appState: {
        currentPageId: app.currentPageId,
      },
    },
    after: {
      appState: {
        currentPageId: pageId,
      },
    },
  }
}
