import { createClient } from '@liveblocks/client'
import type { BaseUserMeta, EnsureJson } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import { LiveMap, LiveObject } from '@liveblocks/client'
import type { TDUser, TDShape, TDBinding, TDDocument } from '@tldraw/tldraw'

const client = createClient({
  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_API_KEY || '',
  throttle: 100,
})

// Presence represents the properties that will exist on every User in the
// Liveblocks Room and that will automatically be synchronized between
// connected Users. Accessible through the `user.presence` property.
type Presence = {
  id?: string
  user: EnsureJson<TDUser>
}

// Storage represents the shared document that persists in the Room, even after
// all Users leave. All Live structures here are automatically kept in sync
// between connected clients.
export type Storage = {
  version: number
  doc: LiveObject<{
    uuid: string
    document: EnsureJson<TDDocument>
    migrated?: boolean
  }>
  bindings: LiveMap<string, EnsureJson<TDBinding>>
  shapes: LiveMap<string, EnsureJson<TDShape>>
}

// Optionally, UserMeta represents static/readonly metadata on each User, as
// provided by a potential custom Liveblocks auth backend. This isn't used for
// TLDraw.
//
// type UserMeta = {
//   id?: string,  // Accessible through `user.id`
//   info?: Json,  // Accessible through `user.info`
// };
//
type UserMeta = BaseUserMeta

// Custom Events that TLDraw broadcasts between connected users
type RoomEvent =
  // | { name: 'click', x: number, y: number }
  // | { name: 'like', emoji: string }
  // | etc.
  { name: 'exit'; userId: string }

const { RoomProvider, useRedo, useUndo, useRoom, useUpdateMyPresence } = createRoomContext<
  Presence,
  Storage,
  UserMeta,
  RoomEvent
>(client)

export { RoomProvider, useRedo, useUndo, useRoom, useUpdateMyPresence }
