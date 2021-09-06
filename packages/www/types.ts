import { TLDrawDocument } from '@tldraw/tldraw'

export interface TLDrawProject {
  uuid: string
  id: string
  nonce: string
  document: TLDrawDocument
}
