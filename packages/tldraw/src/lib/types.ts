import { TLPage, TLPageState, TLShape } from '@tldraw/core'

export interface TLDocument<T extends TLShape> {
  currentPageId: string
  pages: Record<string, TLPage<T>>
  pageStates: Record<string, TLPageState>
}
