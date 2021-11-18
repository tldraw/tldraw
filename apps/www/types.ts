import { TDDocument } from '@tldraw/tldraw'
import { LiveObject } from '@liveblocks/client'

export interface TldrawStorage {
  doc: LiveObject<{ uuid: string; document: TDDocument }>
}
