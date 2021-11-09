import type { TLDrawDocument } from '@tldraw/tldraw'

export function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export function sanitizeDocument(prev: TLDrawDocument, next: TLDrawDocument): TLDrawDocument {
  Object.values(prev.pageStates).forEach((pageState) => {
    // Ensure that the previous page state is preserved, if possible
    if (next.pages[pageState.id] !== undefined) {
      next.pageStates[pageState.id] = pageState
    }
  })

  return next
}
