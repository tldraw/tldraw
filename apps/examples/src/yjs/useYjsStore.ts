import { TLStoreWithStatus, createTLStore, defaultShapes } from '@tldraw/tldraw'
import { useEffect, useState } from 'react'
import {
	initializeStoreFromYjsDoc,
	roomProvider,
	syncStoreChangesToYjsDoc,
	syncStorePresenceToYjsAwareness,
	syncYjsAwarenessToStorePresence,
	syncYjsDocChangesToStore,
} from './y'

export function useYjsStore() {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' })

	useEffect(() => {
		const store = createTLStore({ shapes: defaultShapes })

		roomProvider.on('status', (connected: boolean) => {
			if (connected) {
				initializeStoreFromYjsDoc(store)

				// Sync doc changes
				syncYjsDocChangesToStore(store)
				syncStoreChangesToYjsDoc(store)

				// Sync awareness changes
				syncStorePresenceToYjsAwareness(store)
				syncYjsAwarenessToStorePresence(store)

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

		roomProvider.connect()
	}, [])

	return storeWithStatus
}
