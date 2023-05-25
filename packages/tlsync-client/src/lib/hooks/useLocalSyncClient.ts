import { SyncedStore, TLInstanceId, TLStore, TLUserId, uniqueId } from '@tldraw/editor'
import { useEffect, useState } from 'react'
import { TLLocalSyncClient } from '../TLLocalSyncClient'
import '../hardReset'
import { subscribeToUserData } from '../persistence-constants'

/**
 * This is a temporary solution that will be replaced with the remote sync client once it has the db
 * integrated
 *
 * @public
 */
export function useLocalSyncClient({
	universalPersistenceKey,
	instanceId,
	userId,
	store,
}: {
	universalPersistenceKey: string
	instanceId: TLInstanceId
	userId: TLUserId
	store: TLStore
}): SyncedStore {
	const [state, setState] = useState<{ id: string; syncedStore: SyncedStore } | null>(null)

	useEffect(() => {
		const id = uniqueId()

		setState({
			id,
			syncedStore: { status: 'loading' },
		})

		const setSyncedStore = (syncedStore: SyncedStore) => {
			setState((prev) => {
				if (prev?.id === id) {
					return { id, syncedStore }
				}
				return prev
			})
		}

		const client = new TLLocalSyncClient(store, {
			universalPersistenceKey,
			onLoad() {
				setSyncedStore({ status: 'synced', store })
			},
			onLoadError(err) {
				setSyncedStore({ status: 'error', error: err })
			},
		})

		const userDataUnsubcribe = subscribeToUserData(store)

		return () => {
			setState((prevState) => (prevState?.id === id ? null : prevState))
			userDataUnsubcribe()
			client.close()
		}
	}, [instanceId, universalPersistenceKey, store, userId])

	return state?.syncedStore ?? { status: 'loading' }
}
