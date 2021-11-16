import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

export function changePage(app: TldrawApp, pageId: string): TldrawCommand {
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
