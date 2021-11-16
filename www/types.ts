import { TldrawDocument } from '@tldraw/Tldraw'
import { LiveObject } from '@liveblocks/client'

export interface TldrawStorage {
  doc: LiveObject<{ uuid: string; document: TldrawDocument }>
}
