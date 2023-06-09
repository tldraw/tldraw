import { HistoryEntry } from '@tldraw/store'
import { Editor, LoadingScreen, TLRecord, Tldraw, createTLStore } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useCallback, useEffect, useState } from 'react'
import { roomAwareness, roomProvider, yRecords } from './client'
import empty_room from './empty_room'

export default function YjsExample() {
	const [store] = useState(() => createTLStore())
	const [ready, setReady] = useState(false)

	useEffect(() => {
		// Create a temporary store

		roomProvider.on('sync', (connected: boolean) => {
			if (connected) {
				const tempStore = createTLStore()
				const records = [...yRecords.values()]
				if (records.length === 0) {
					tempStore.loadSnapshot(empty_room)
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
		function syncChangeWithYjs({ changes, source }: HistoryEntry<TLRecord>) {
			if (source !== 'user') return

			// added
			Object.values(changes.added).forEach((record) => {
				yRecords.set(record.id, record)
			})

			// removed
			Object.values(changes.removed).forEach((record) => {
				yRecords.delete(record.id)
			})

			// updated
			Object.values(changes.updated).forEach(([_, record]) => {
				yRecords.set(record.id, record)
			})
		}

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

		editor.addListener('change', syncChangeWithYjs)

		// Awareness
		roomAwareness.on('change', () => {
			// noop
		})

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
