import {
	DocumentRecordType,
	PageRecordType,
	TLDocument,
	TLInstancePresence,
	TLPageId,
	TLRecord,
	TLStoreWithStatus,
	TLUserPreferences,
	USER_COLORS,
	createPresenceStateDerivation,
	createTLStore,
	defaultShapes,
} from '@tldraw/tldraw'
import { debounce } from '@tldraw/utils'
import { useEffect, useState } from 'react'
import { atom, react } from 'signia'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const doc = new Y.Doc({ gc: true })

export function useYjsStore({
	roomId = 'example',
	version = 1,
	hostUrl = process.env.NODE_ENV === 'development' ? 'ws://localhost:1234' : 'wss://demos.yjs.dev',
}: Partial<{ hostUrl: string; roomId: string; version: number }>) {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' })

	useEffect(() => {
		const yRecords = doc.getMap<TLRecord>(`tl_${roomId}_${version}`)

		const room = new WebsocketProvider(hostUrl, roomId, doc, { connect: false })

		const unsubs: (() => void)[] = []
		const store = createTLStore({ shapes: defaultShapes })

		room.on('status', (connected: boolean) => {
			if (connected) {
				/* ----------------- Initialization ----------------- */

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

				/* -------------------- Document -------------------- */

				// Sync store changes to the yjs doc
				unsubs.push(
					store.listen(
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
				)

				// Sync the yjs doc changes to the store
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
				unsubs.push(() => yRecords.unobserveDeep(handleChange))

				/* -------------------- Awareness ------------------- */

				// Get the persisted user preferences or use the defaults

				const userId = room.awareness.clientID.toString()

				let userPreferences: TLUserPreferences = {
					id: userId,
					name: 'User Name',
					locale: 'en',
					color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
					isDarkMode: false,
					isSnapMode: false,
					animationSpeed: 1,
				}

				const persistedUserPreferences = localStorage.getItem(`tldraw-presence-${version}`)
				if (persistedUserPreferences !== null) {
					try {
						userPreferences = JSON.parse(persistedUserPreferences) as TLUserPreferences
					} catch (e: any) {
						// Something went wrong, persist the defaults instead
						localStorage.setItem(`tldraw-presence-${version}`, JSON.stringify(userPreferences))
					}
				}

				const debouncedPersist = debounce((presence: TLInstancePresence) => {
					const preferences: TLUserPreferences = {
						...userPreferences,
						name: presence.userName,
						color: presence.color,
					}

					localStorage.setItem(`tldraw-presence-${version}`, JSON.stringify(preferences))
				}, 1000)

				// Create the instance presence derivation
				const userPreferencesSignal = atom<TLUserPreferences>('user preferences', userPreferences)
				const presenceDerivation = createPresenceStateDerivation(userPreferencesSignal)(store)
				room.awareness.setLocalStateField('presence', presenceDerivation.value)

				// Sync the instance presence changes to yjs awareness
				unsubs.push(
					react('when presence changes', () => {
						const presence = presenceDerivation.value
						if (presence && presence.userId === userId) {
							room.awareness.setLocalStateField('presence', presence)
							debouncedPersist(presence)
						}
					})
				)

				// Sync yjs awareness changes to the store
				const handleUpdate = ({
					added,
					updated,
					removed,
				}: {
					added: number[]
					updated: number[]
					removed: number[]
				}) => {
					const states = room.awareness.getStates()

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

				room.awareness.on('update', handleUpdate)
				unsubs.push(() => room.awareness.off('update', handleUpdate))

				// And we're done!

				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'online',
				})
			} else {
				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'offline',
				})
			}
		})

		room.connect()

		return () => {
			unsubs.forEach((fn) => fn())
			unsubs.length = 0
		}
	}, [hostUrl, roomId, version])

	return storeWithStatus
}
