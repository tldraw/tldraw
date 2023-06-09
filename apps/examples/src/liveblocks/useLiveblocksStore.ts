import { LiveMap } from '@liveblocks/client'
import {
	DocumentRecordType,
	PageRecordType,
	TLDocument,
	TLPageId,
	TLStoreEventInfo,
	TLStoreWithStatus,
	createTLStore,
} from '@tldraw/tldraw'
import { useEffect, useState } from 'react'
import { useRoom } from './liveblocks.config'

export function useLiveblocksStore() {
	const room = useRoom()

	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' })

	useEffect(() => {
		const unsubs: Record<string, () => void> = {}

		async function setup() {
			if (!room) return

			const store = createTLStore()

			const storage = await room.getStorage()

			const recordsSnapshot = room.getStorageSnapshot()?.get('records')

			if (!recordsSnapshot) {
				// Initialize storage with records from store
				storage.root.set('records', new LiveMap())
				const liveRecords = storage.root.get('records')
				room.batch(() => {
					store.allRecords().forEach((record) => {
						liveRecords.set(record.id, record)
					})
				})
			} else {
				// Initialize store with records from storage
				store.clear()
				store.put(
					[
						DocumentRecordType.create({
							id: 'document:document' as TLDocument['id'],
						}),
						PageRecordType.create({
							id: 'page:page' as TLPageId,
							name: 'Page 1',
							index: 'a1',
						}),
						...[...recordsSnapshot.values()],
					],
					'initialize'
				)
			}

			const liveRecords = storage.root.get('records')

			// Sync store changes with room document
			unsubs.store_document = store.listen(
				({ changes }: TLStoreEventInfo) => {
					room.batch(() => {
						Object.values(changes.added).forEach((record) => {
							liveRecords.set(record.id, record)
						})

						Object.values(changes.updated).forEach(([_, record]) => {
							liveRecords.set(record.id, record)
						})

						Object.values(changes.removed).forEach((record) => {
							liveRecords.delete(record.id)
						})
					})
				},
				{ source: 'user', scope: 'document' }
			)

			// Sync store changes with room presence
			function syncStoreWithPresence({ changes }: TLStoreEventInfo) {
				room.batch(() => {
					Object.values(changes.added).forEach((record) => {
						room.updatePresence({ [record.id]: record })
					})

					Object.values(changes.updated).forEach(([_, record]) => {
						room.updatePresence({ [record.id]: record })
					})

					Object.values(changes.removed).forEach((record) => {
						room.updatePresence({ [record.id]: null })
					})
				})
			}

			unsubs.store_session = store.listen(syncStoreWithPresence, {
				source: 'user',
				scope: 'session',
			})

			unsubs.store_presence = store.listen(syncStoreWithPresence, {
				source: 'user',
				scope: 'presence',
			})

			// Sync room document changes with the store
			unsubs.room_document = room.subscribe(liveRecords, (liveRecords) => {
				store.mergeRemoteChanges(() => {
					store.put([...liveRecords.values()])
				})
			})

			// Sync room presence changes with the store
			unsubs.room_presence = room.subscribe('others', (others, event) => {
				switch (event.type) {
					case 'enter': {
						break
					}
					case 'leave': {
						break
					}
					case 'reset': {
						break
					}
					case 'update': {
						break
					}
				}
			})

			setStoreWithStatus({
				store,
				status: 'synced-remote',
				connectionStatus: 'online',
			})
		}

		setup()

		return () => {
			Object.values(unsubs).forEach((unsub) => unsub())
		}
	}, [room])

	return storeWithStatus
}
