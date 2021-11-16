import { TDDocument } from '@tldraw/Tldraw'
import { LiveObject } from '@liveblocks/client'

export interface TldrawStorage {
  doc: LiveObject<{ uuid: string; document: TDDocument }>
}
