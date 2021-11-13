import { TLDrawDocument } from '@tldraw/tldraw'
import { LiveObject } from '@liveblocks/client'

export interface TLDrawStorage {
  doc: LiveObject<{ uuid: string; document: TLDrawDocument }>
}
