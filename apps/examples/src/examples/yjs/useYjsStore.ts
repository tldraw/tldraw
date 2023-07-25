import {
	DocumentRecordType,
	InstancePresenceRecordType,
	PageRecordType,
	TLAnyShapeUtilConstructor,
	TLDocument,
	TLInstancePresence,
	TLPageId,
	TLRecord,
	TLStoreWithStatus,
	computed,
	createPresenceStateDerivation,
	createTLStore,
	defaultShapeUtils,
	getUserPreferences,
	react,
} from '@tldraw/tldraw'
import { useEffect, useMemo, useState } from 'react'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export function useYjsStore({
	roomId = 'example',
	hostUrl = process.env.NODE_ENV === 'development' ? 'ws://localhost:1234' : 'wss://demos.yjs.dev',
	shapeUtils = [],
}: Partial<{
	hostUrl: string
	roomId: string
	version: number
	shapeUtils: TLAnyShapeUtilConstructor[]
}>) {
	const [store] = useState(() =>
		createTLStore({ shapeUtils: [...defaultShapeUtils, ...shapeUtils] })
	)
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' })

	const { doc, room, yRecords } = useMemo(() => {
		const doc = new Y.Doc({ gc: true })
		return {
			doc,
			room: new WebsocketProvider(hostUrl, roomId, doc, { connect: true }),
			yRecords: doc.getMap<TLRecord>(`tl_${roomId}`),
		}
	}, [hostUrl, roomId])

	useEffect(() => {
		const unsubs: (() => void)[] = []

		// We'll use this flag to prevent repeating subscriptions if our connection drops and reconnects.
		let didConnect = false

		room.on('status', ({ status }: { status: 'connecting' | 'disconnected' | 'connected' }) => {
			// If we're disconnected, set the store status to 'synced-remote' and the connection status to 'offline'
			if (status === 'connecting' || status === 'disconnected') {
				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'offline',
				})
				return
			}

			if (status !== 'connected') return

			if (didConnect) {
				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'online',
				})
				return
			}

			// Ok, we're connecting for the first time. Let's get started!
			didConnect = true

			// Initialize the store with the yjs doc records—or, if the yjs doc
			// is empty, initialize the yjs doc with the default store records.
			if (yRecords.size === 0) {
				// Create the initial store records
				Y.transact(doc, () => {
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
				})

				// Sync the store records to the yjs doc
				doc.transact(() => {
					for (const record of store.allRecords()) {
						yRecords.set(record.id, record)
					}
				})
			} else {
				// Replace the store records with the yjs doc records
				Y.transact(doc, () => {
					store.clear()
					store.put([...yRecords.values()])
				})
			}

			/* -------------------- Document -------------------- */

			// Sync store changes to the yjs doc
			unsubs.push(
				store.listen(
					function syncStoreChangesToYjsDoc({ changes }) {
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
					{ source: 'user', scope: 'document' } // only sync user's document changes
				)
			)

			// Sync the yjs doc changes to the store
			const handleChange = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
				if (transaction.local) return

				const toRemove: TLRecord['id'][] = []
				const toPut: TLRecord[] = []

				events.forEach((event) => {
					event.changes.keys.forEach((change, id) => {
						switch (change.action) {
							case 'add':
							case 'update': {
								toPut.push(yRecords.get(id)!)
								break
							}
							case 'delete': {
								toRemove.push(id as TLRecord['id'])
								break
							}
						}
					})
				})

				// put / remove the records in the store
				store.mergeRemoteChanges(() => {
					if (toRemove.length) store.remove(toRemove)
					if (toPut.length) store.put(toPut)
				})
			}

			yRecords.observeDeep(handleChange)
			unsubs.push(() => yRecords.unobserveDeep(handleChange))

			/* -------------------- Awareness ------------------- */

			// Create the instance presence derivation
			const yClientId = room.awareness.clientID.toString()
			const presenceId = InstancePresenceRecordType.createId(yClientId)
			const userPreferencesComputed = computed('ok', () => getUserPreferences())
			const presenceDerivation = createPresenceStateDerivation(
				userPreferencesComputed,
				presenceId
			)(store)

			// Set our initial presence from the derivation's current value
			room.awareness.setLocalStateField('presence', presenceDerivation.value)

			// When the derivation change, sync presence to to yjs awareness
			unsubs.push(
				react('when presence changes', () => {
					const presence = presenceDerivation.value
					requestAnimationFrame(() => {
						room.awareness.setLocalStateField('presence', presence)
					})
				})
			)

			// Sync yjs awareness changes to the store
			const handleUpdate = (update: { added: number[]; updated: number[]; removed: number[] }) => {
				const states = room.awareness.getStates() as Map<number, { presence: TLInstancePresence }>

				const toRemove: TLInstancePresence['id'][] = []
				const toPut: TLInstancePresence[] = []

				// Connect records to put / remove
				for (const clientId of update.added) {
					const state = states.get(clientId)
					if (state?.presence && state.presence.id !== presenceId) {
						toPut.push(state.presence)
					}
				}

				for (const clientId of update.updated) {
					const state = states.get(clientId)
					if (state?.presence && state.presence.id !== presenceId) {
						toPut.push(state.presence)
					}
				}

				for (const clientId of update.removed) {
					toRemove.push(InstancePresenceRecordType.createId(clientId.toString()))
				}

				// put / remove the records in the store
				store.mergeRemoteChanges(() => {
					if (toRemove.length) store.remove(toRemove)
					if (toPut.length) store.put(toPut)
				})
			}

			room.awareness.on('update', handleUpdate)
			unsubs.push(() => room.awareness.off('update', handleUpdate))

			// And we're done!
			setStoreWithStatus({
				store,
				status: 'synced-remote',
				connectionStatus: 'online',
			})
		})

		return () => {
			unsubs.forEach((fn) => fn())
			unsubs.length = 0
		}
	}, [room, doc, store, yRecords])

	return storeWithStatus
}
