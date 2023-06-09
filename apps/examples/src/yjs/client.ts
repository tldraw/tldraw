import { TLRecord } from '@tldraw/tldraw'
import YPartyKitProvider from 'y-partykit/provider'
import * as Y from 'yjs'

const partykitHost =
	process.env.NODE_ENV === 'development' ? 'localhost:1999' : 'yjs.threepointone.partykit.dev'

export const doc = new Y.Doc({
	gc: true,
})

const ROOM_ID = 'tldraw-5'

export const roomProvider = new YPartyKitProvider(partykitHost, ROOM_ID, doc, {
	connect: false,
})

// Presence

export const roomAwareness = roomProvider.awareness

// Doc

export type YRecords = Y.Map<TLRecord>

export const yRecords = doc.getMap<TLRecord>(`tl_${ROOM_ID}`)
