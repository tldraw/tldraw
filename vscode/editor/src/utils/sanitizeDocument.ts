import type { TLDrawDocument } from '@tldraw/tldraw'

export function sanitizeDocument(prev: TLDrawDocument, next: TLDrawDocument): TLDrawDocument {
  return next

  // // Don't save changes to page state?

  // const final = { ...next, pageStates: { ...next.pageStates } }

  // Object.values(prev.pageStates).forEach((pageState) => {
  //   if (next.pages[pageState.id] !== undefined) {
  //     final.pageStates[pageState.id] = pageState
  //   }
  // })

  // return final
}
