import {
	DocumentRecordType,
	PageRecordType,
	TLDocument,
	TLInstancePresence,
	TLPageId,
	TLRecord,
	TLStore,
	USER_COLORS,
	createPresenceStateDerivation,
} from '@tldraw/tldraw'
import { atom, react } from 'signia'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const ROOM_ID = 'tldraw-22'
const HOST_URL =
	process.env.NODE_ENV === 'development' ? 'ws://localhost:1234' : 'wss://demos.yjs.dev'

export const doc = new Y.Doc({ gc: true })
export const yRecords = doc.getMap<TLRecord>(`tl_${ROOM_ID}`)

export const roomProvider = new WebsocketProvider(HOST_URL, ROOM_ID, doc, { connect: false })
export const roomAwareness = roomProvider.awareness

roomAwareness.setLocalState({})
const userId = roomAwareness.clientID.toString()

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

export function syncStorePresenceToYjsAwareness(store: TLStore) {
	const userPreferences = atom<any>('user preferences', {
		id: userId,
		name: 'User Name',
		locale: 'en',
		color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
		isDarkMode: false,
		isSnapMode: false,
		animationSpeed: 1,
	})

	const presenceDerivation = createPresenceStateDerivation(userPreferences)(store)
	roomAwareness.setLocalStateField('presence', presenceDerivation.value)

	return react('when presence changes', () => {
		const presence = presenceDerivation.value
		if (presence) {
			if (presence.userId === userId) {
				roomAwareness.setLocalStateField('presence', presence)
			}
		}
	})
}

export function syncYjsAwarenessToStorePresence(store: TLStore) {
	roomAwareness.on(
		'update',
		({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
			const states = roomAwareness.getStates()

			store.mergeRemoteChanges(() => {
				added.forEach((id) => {
					const state = states.get(id) as { presence: TLInstancePresence }
					if (state.presence) {
						if (state.presence.userId !== userId) {
							store.put([state.presence])
						}
					}
				})

				updated.forEach((id) => {
					const state = states.get(id) as { presence: TLInstancePresence }
					if (state.presence) {
						if (state.presence.userId !== userId) {
							store.put([state.presence])
						}
					}
				})

				if (removed.length) {
					const allRecords = store.allRecords()

					removed.forEach((id) => {
						const stringId = id.toString()
						const recordsToRemove = allRecords
							.filter((record) => 'userId' in record && record.userId === stringId)
							.map((record) => record.id)

						store.remove(recordsToRemove)
					})
				}
			})
		}
	)
}
