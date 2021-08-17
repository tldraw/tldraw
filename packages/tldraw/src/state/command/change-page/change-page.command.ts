import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function changePage(data: Data, pageId: string): Command {
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
