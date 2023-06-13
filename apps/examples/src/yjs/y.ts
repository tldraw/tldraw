import {
	DocumentRecordType,
	PageRecordType,
	TLDocument,
	TLPageId,
	TLRecord,
	TLStore,
	TLStoreEventInfo,
} from '@tldraw/tldraw'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const ROOM_ID = 'tldraw-20'
const HOST_URL =
	process.env.NODE_ENV === 'development' ? 'ws://localhost:1234' : 'wss://demos.yjs.dev'

export const doc = new Y.Doc({ gc: true })
export const yRecords = doc.getMap<TLRecord>(`tl_${ROOM_ID}`)

export const roomProvider = new WebsocketProvider(HOST_URL, ROOM_ID, doc, { connect: false })
export const roomAwareness = roomProvider.awareness
roomAwareness.setLocalState({})

/* -------------------- Document -------------------- */

export function initializeStoreFromYjsDoc(store: TLStore) {
	const existingYjsRecords = [...yRecords.values()]

	if (existingYjsRecords.length === 0) {
		doc.transact(() => {
			store.clear()
			store.put([
				DocumentRecordType.create({
					id: 'document:document' as TLDocument['id'],
				}),
				PageRecordType.create({
					id: 'page:page' as TLPageId,
					name: 'Page 1',
					index: 'a1',
				}),
			])
			store.allRecords().forEach((record) => {
				yRecords.set(record.id, record)
			})
		})
	} else {
		store.put(existingYjsRecords, 'initialize')
	}
}

export function syncStoreChangesToYjsDoc(store: TLStore) {
	return store.listen(
		({ changes }) => {
			doc.transact(() => {
				Object.values(changes.added).forEach((record) => {
					yRecords.set(record.id, record)
				})

				Object.values(changes.updated).forEach(([_, record]) => {
					yRecords.set(record.id, record)
				})

				Object.values(changes.removed).forEach((record) => {
					yRecords.delete(record.id)
				})
			})
		},
		{ source: 'user', scope: 'document' }
	)
}

export function syncYjsDocChangesToStore(store: TLStore) {
	yRecords.observeDeep(([event]) => {
		store.mergeRemoteChanges(() => {
			event.changes.keys.forEach((change, id) => {
				switch (change.action) {
					case 'add':
					case 'update': {
						store.put([yRecords.get(id)!])
						break
					}
					case 'delete': {
						store.remove([id as TLRecord['id']])
						break
					}
				}
			})
		})
	})
}

/* -------------------- Awareness ------------------- */

function syncStoreChangesToYjsAwareness({ changes }: TLStoreEventInfo) {
	roomAwareness.doc.transact(() => {
		Object.values(changes.added).forEach((record) => {
			const idWithUserId = record.id.split(':')[0] + ':' + roomAwareness.clientID
			roomAwareness.setLocalStateField(record.typeName, {
				...record,
				id: idWithUserId,
			})
		})

		Object.values(changes.updated).forEach(([_, record]) => {
			const idWithUserId = record.id.split(':')[0] + ':' + roomAwareness.clientID
			roomAwareness.setLocalStateField(record.typeName, {
				...record,
				id: idWithUserId,
			})
		})

		Object.values(changes.removed).forEach((record) => {
			roomAwareness.setLocalStateField(record.typeName, null)
		})
	})
}

export function syncStoreSessionToYjsAwareness(store: TLStore) {
	return store.listen(syncStoreChangesToYjsAwareness, { source: 'user', scope: 'session' })
}

export function syncStorePresenceToYjsAwareness(store: TLStore) {
	return store.listen(syncStoreChangesToYjsAwareness, { source: 'user', scope: 'presence' })
}

export function syncYjsAwarenessChangesToStore(store: TLStore) {
	roomAwareness.on(
		'update',
		({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
			const states = roomAwareness.getStates()

			store.mergeRemoteChanges(() => {
				added.forEach((id) => {
					const state = states.get(id) as Record<TLRecord['id'], TLRecord>
					const records = Object.values(state)
					store.put(records)
				})

				updated.forEach((id) => {
					const state = states.get(id) as Record<TLRecord['id'], TLRecord>
					const records = Object.values(state)
					store.put(records)
				})

				if (removed.length) {
					const allRecords = store.allRecords()

					removed.forEach((id) => {
						const recordsToRemove = allRecords
							.filter((record) => record.id.split(':')[1] === id.toString())
							.map((record) => record.id)

						store.remove(recordsToRemove)
					})
				}
			})
		}
	)
}
