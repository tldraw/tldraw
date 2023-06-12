import { TLStoreWithStatus, createTLStore } from '@tldraw/tldraw'
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

export function useYjsStore() {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' })

	useEffect(() => {
		const store = createTLStore()
		initializeStoreFromYjsDoc(store)
		syncYjsDocChangesToStore(store)
		syncStoreChangesToYjsDoc(store)
		syncYjsAwarenessChangesToStore(store)
		syncStorePresenceToYjsAwareness(store)
		syncStoreSessionToYjsAwareness(store)

		roomProvider.on('status', (connected: boolean) => {
			if (connected) {
				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'online',
				})
			}
		})

		roomProvider.connect()
	}, [])

	return storeWithStatus
}
