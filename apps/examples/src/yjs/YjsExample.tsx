import { TLStoreWithStatus, Tldraw, createTLStore } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useEffect, useState } from 'react'
import {
	initializeStoreFromYjsDoc,
	roomProvider,
	syncStoreChangesToYjsDoc,
	syncStorePresenceToYjsAwareness,
	syncStoreSessionToYjsAwareness,
	syncYjsAwarenessChangesToStore,
	syncYjsDocChangesToStore,
} from './y'

export default function YjsExample() {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' })

	useEffect(() => {
		roomProvider.on('status', (connected: boolean) => {
			if (connected) {
				const store = createTLStore()
				initializeStoreFromYjsDoc(store)
				syncYjsDocChangesToStore(store)
				syncStoreChangesToYjsDoc(store)
				syncYjsAwarenessChangesToStore(store)
				syncStorePresenceToYjsAwareness(store)
				syncStoreSessionToYjsAwareness(store)

				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'online',
				})
			}
		})

		roomProvider.connect()
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus store={storeWithStatus} />
		</div>
	)
}
