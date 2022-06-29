import type { TDPage, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

export function movePage(app: TldrawApp, pageId: string, index: number): TldrawCommand {
  const { pages } = app.document
  const currentIndex = pages[pageId].childIndex ?? 0
  const movingUp = index < currentIndex
  const startToMove = Math.min(index, currentIndex)
  const endToMove = Math.max(index, currentIndex)

  const pagesToMove = Object.values(pages).filter(
    (page) =>
      page.childIndex !== undefined &&
      page.childIndex <= endToMove &&
      page.childIndex >= startToMove
  )

  return {
    id: 'move_page',
    before: {
      document: {
        pages: Object.fromEntries(
          pagesToMove.map((p: TDPage) => {
            return [p.id, { childIndex: p.childIndex }]
          })
        ),
      },
    },
    after: {
      document: {
        pages: Object.fromEntries(
          pagesToMove.map((p) => {
            if (p.childIndex == undefined) return [p.id, { childIndex: p.childIndex }]
            return [
              p.id,
              { childIndex: p.id == pageId ? index : p.childIndex + (movingUp ? 1 : -1) },
            ]
          })
        ),
      },
    },
  }
}
