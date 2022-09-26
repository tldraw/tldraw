import type { TldrawApp } from '~state/TldrawApp'
import type { TldrawCommand } from '~types'

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
