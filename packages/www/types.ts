import { TLDrawDocument, TLDrawPatch } from '@tldraw/tldraw'

export interface TLDrawProject {
  uuid: string
  id: string
  nonce: string
  patch: { time: number; patch: TLDrawPatch }[]
  document: TLDrawDocument
}
