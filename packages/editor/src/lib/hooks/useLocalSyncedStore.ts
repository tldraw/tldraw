import { useEffect, useState } from 'react'
import { StoreOptions, createTLStore } from '../config/createTLStore'
import { uniqueId } from '../utils/data'
import { SyncedStore } from '../utils/sync/SyncedStore'
import { TLLocalSyncClient } from '../utils/sync/TLLocalSyncClient'

/** @internal */
export function useLocalSyncedStore(
	opts = {} as { persistenceKey?: string } & StoreOptions
): SyncedStore {
	const { persistenceKey, ...rest } = opts

	const [state, setState] = useState<{ id: string; syncedStore: SyncedStore } | null>(null)
	const [store] = useState(() => createTLStore(rest))

	useEffect(() => {
		const id = uniqueId()

		if (!persistenceKey) {
			setState({
				id,
				syncedStore: { status: 'not-synced', store },
			})
			return
		}

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
			universalPersistenceKey: persistenceKey,
			onLoad() {
				setSyncedStore({ store, status: 'synced-local' })
			},
			onLoadError(err: any) {
				setSyncedStore({ status: 'error', error: err })
			},
		})

		return () => {
			setState((prevState) => (prevState?.id === id ? null : prevState))
			client.close()
		}
	}, [persistenceKey, store])

	return state?.syncedStore ?? { status: 'loading' }
}
