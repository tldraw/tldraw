import {
	DocumentRecordType,
	PageRecordType,
	TLDocument,
	TLInstancePresence,
	TLPageId,
	TLRecord,
	TLStore,
	TLUserPreferences,
	USER_COLORS,
	createPresenceStateDerivation,
} from '@tldraw/tldraw'
import { debounce } from '@tldraw/utils'
import { atom, react } from 'signia'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const VERSION = 23

const ROOM_ID = `tldraw-${VERSION}`
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
	const handleChange = ([event]: Y.YEvent<any>[]) => {
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
	}

	yRecords.observeDeep(handleChange)

	return () => {
		yRecords.unobserveDeep(handleChange)
	}
}

/* -------------------- Awareness ------------------- */

// We persist the user preferences in local storage so that they can be restored later

const userId = roomAwareness.clientID.toString()

let userPreferences: TLUserPreferences = {
	id: userId,
	name: 'User Name',
	locale: 'en',
	color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
	isDarkMode: false,
	isSnapMode: false,
	animationSpeed: 1,
}

const persistedUserPreferences = localStorage.getItem(`tldraw-presence-${VERSION}`)
if (persistedUserPreferences !== null) {
	try {
		userPreferences = JSON.parse(persistedUserPreferences) as TLUserPreferences
	} catch (e: any) {
		// Something went wrong, persist the defaults instead
		localStorage.setItem(`tldraw-presence-${VERSION}`, JSON.stringify(userPreferences))
	}
}

export function syncStorePresenceToYjsAwareness(store: TLStore) {
	const userPreferencesSignal = atom<TLUserPreferences>('user preferences', userPreferences)
	const presenceDerivation = createPresenceStateDerivation(userPreferencesSignal)(store)
	roomAwareness.setLocalStateField('presence', presenceDerivation.value)

	const debouncedPersist = debounce((presence: TLInstancePresence) => {
		const preferences: TLUserPreferences = {
			...userPreferences,
			name: presence.userName,
			color: presence.color,
		}

		localStorage.setItem(`tldraw-presence-${VERSION}`, JSON.stringify(preferences))
	}, 1000)

	return react('when presence changes', () => {
		const presence = presenceDerivation.value
		if (presence && presence.userId === userId) {
			roomAwareness.setLocalStateField('presence', presence)
			debouncedPersist(presence)
			// todo: occassionally persist the user preferences
		}
	})
}

export function syncYjsAwarenessToStorePresence(store: TLStore) {
	function handleUpdate({
		added,
		updated,
		removed,
	}: {
		added: number[]
		updated: number[]
		removed: number[]
	}) {
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

	roomAwareness.on('update', handleUpdate)

	return () => {
		roomAwareness.off('update', handleUpdate)
	}
}
