import { Editor, LoadingScreen, TLRecord, Tldraw, createTLStore, uniqueId } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useCallback, useEffect, useState } from 'react'
import { doc, roomAwareness, roomProvider, yRecords } from './client'
import empty_room from './empty_room'

const userId = uniqueId()

export default function YjsExample() {
	const [store] = useState(() => createTLStore())
	const [ready, setReady] = useState(false)

	useEffect(() => {
		roomProvider.on('status', (connected: boolean) => {
			if (connected) {
				// Create a temporary store
				const tempStore = createTLStore()
				const records = [...yRecords.values()]
				if (records.length === 0) {
					tempStore.loadSnapshot(empty_room)
					doc.transact(() => {
						tempStore.allRecords().forEach((record) => {
							yRecords.set(record.id, record)
						})
					})
				} else {
					tempStore.put(records)
				}

				const tempStoreSnapshot = tempStore.getSnapshot()
				store.loadSnapshot(tempStoreSnapshot)
				setReady(true)
			}
		})

		roomProvider.connect()
	}, [store])

	const handleMount = useCallback((editor: Editor) => {
		// Observe changes
		yRecords.observeDeep(([event]) => {
			editor.store.mergeRemoteChanges(() => {
				event.changes.keys.forEach((change, id) => {
					switch (change.action) {
						case 'add':
						case 'update': {
							editor.store.put([yRecords.get(id)!])
							break
						}
						case 'delete': {
							editor.store.remove([id as TLRecord['id']])
							break
						}
					}
				})
			})
		})

		editor.store.listen(
			function syncChangeWithYjs({ changes }) {
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

		editor.store.listen(
			function syncChangeWithYjsPresence({ changes }) {
				roomAwareness.doc.transact(() => {
					Object.values(changes.added).forEach((record) => {
						roomAwareness.setLocalStateField(record.typeName, {
							...record,
							id: record.id.split(':')[0] + ':' + userId,
						})
					})

					Object.values(changes.updated).forEach(([_, record]) => {
						roomAwareness.setLocalStateField(record.typeName, {
							...record,
							id: record.id.split(':')[0] + ':' + userId,
						})
					})

					Object.values(changes.removed).forEach((record) => {
						const current = { ...roomAwareness.getLocalState() }
						delete current[record.typeName]
						roomAwareness.setLocalState(current)
					})
				})
			},
			{ source: 'user', scope: 'session' }
		)

		// Awareness
		roomAwareness.on(
			'update',
			({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
				const states = roomAwareness.getStates()
				// roomAwareness.getStates(update)
				editor.store.mergeRemoteChanges(() => {
					added.forEach((id: number) => {
						const record = states.get(id) as TLRecord
						editor.store.put(Object.values(record))
					})
					updated.forEach((id: number) => {
						const record = states.get(id) as TLRecord
						editor.store.put(Object.values(record))
					})
					removed.forEach((id: number) => {
						const record = states.get(id) as TLRecord
						if (record) {
							editor.store.remove(Object.values(record))
						}
					})
				})
			}
		)

		return () => {
			// noop
		}
	}, [])

	if (!ready) {
		return (
			<div className="tldraw__editor">
				<LoadingScreen>Loading...</LoadingScreen>
			</div>
		)
	}

	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus store={store} onMount={handleMount} />
		</div>
	)
}
