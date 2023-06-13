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
		const unsubs: (() => void)[] = []
		const store = createTLStore({ shapes: defaultShapes })

		roomProvider.on('status', (connected: boolean) => {
			if (connected) {
				initializeStoreFromYjsDoc(store)

				unsubs.push(
					// Sync doc changes
					syncYjsDocChangesToStore(store),
					syncStoreChangesToYjsDoc(store),

					// Sync awareness changes
					syncYjsAwarenessToStorePresence(store),
					syncStorePresenceToYjsAwareness(store)
				)

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

		return () => {
			unsubs.forEach((fn) => fn())
			unsubs.length = 0
		}
	}, [])

	return storeWithStatus
}
