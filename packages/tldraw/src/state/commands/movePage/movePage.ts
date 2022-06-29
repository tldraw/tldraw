import type { TDPage, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

export function movePage(app: TldrawApp, pageId: string, i: number): TldrawCommand {
  const { pages } = app.document
  const currentIndex = pages[pageId].childIndex
  if (currentIndex === i || currentIndex === undefined) {
    return {
        id: 'move_page',
        before: {
        },
        after: {
        },
      }
  }

  const movingUp = i < currentIndex
  const startToMove = Math.min(i, currentIndex)
  const endToMove = Math.max(i, currentIndex)
  const pagesToMove = Object.values(pages).filter((page) => page.childIndex !== undefined && page.childIndex <= endToMove && page.childIndex >= startToMove)

  return {
    id: 'move_page',
    before: {
      document: {
        pages: Object.fromEntries(pagesToMove.map((p: TDPage)=>{
            return [p.id, { childIndex: p.childIndex }]
        })),
      },
    },
    after: {
      document: {
        pages: Object.fromEntries(pagesToMove.map((p)=>{
            if (p.childIndex == undefined) return [p.id, { childIndex: p.childIndex }];
            return [p.id, { childIndex:  
              (p.id == pageId ? i : 
                p.childIndex + (movingUp ? 1 : -1)
              )
            }]
        })),
      },
    },
  }
}