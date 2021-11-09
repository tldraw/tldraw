import type { TLDrawDocument } from '@tldraw/tldraw'

export function sanitizeDocument(prev: TLDrawDocument, next: TLDrawDocument): TLDrawDocument {
  const final = { ...next, pageStates: { ...next.pageStates } }

  Object.values(prev.pageStates).forEach((pageState) => {
    // Ensure that the previous page state is preserved, if possible
    if (next.pages[pageState.id] !== undefined) {
      final.pageStates[pageState.id] = pageState
    }
  })

  return final
}
