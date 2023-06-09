import { TLRecord } from '@tldraw/tldraw'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const HOST_URL =
	process.env.NODE_ENV === 'development' ? 'ws://localhost:1234' : 'wss://demos.yjs.dev'

export const doc = new Y.Doc({
	gc: true,
})

const ROOM_ID = 'tldraw-12'

export const roomProvider = new WebsocketProvider(HOST_URL, ROOM_ID, doc, {
	connect: false,
})

// Presence

export const roomAwareness = roomProvider.awareness

roomAwareness.setLocalState({})

// Doc

export type YRecords = Y.Map<TLRecord>

export const yRecords = doc.getMap<TLRecord>(`tl_${ROOM_ID}`)
