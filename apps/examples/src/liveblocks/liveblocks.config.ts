import { LiveMap, createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import { TLRecord } from '@tldraw/tldraw'

const client = createClient({
	publicApiKey: 'pk_dev_2ltpvTYbCviEboUl8ALuIUvA9rmSNUPmNuiiSJILWK7bpOTqVVfiRCK0eg7Unrld',
	throttle: 16,
})

type Presence = any

type Storage = {
	records: LiveMap<TLRecord['id'], any>
}

export const { RoomProvider, useRoom, useOthers, useUpdateMyPresence, useStorage } =
	createRoomContext<Presence, Storage>(client)
