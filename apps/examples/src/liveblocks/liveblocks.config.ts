import { LiveMap, createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import { TLRecord } from '@tldraw/tldraw'

const client = createClient({
	publicApiKey: 'GET_A_KEY_FROM_LIVEBLOCKS_DOT_COM',
	throttle: 16,
})

type Presence = any

type Storage = {
	records: LiveMap<TLRecord['id'], any>
}

export const { RoomProvider, useRoom, useOthers, useUpdateMyPresence, useStorage } =
	createRoomContext<Presence, Storage>(client)
