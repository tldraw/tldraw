import { SyncedStore, TLStore, uniqueId } from '@tldraw/editor'
import { useEffect, useState } from 'react'
import { TLLocalSyncClient } from '../TLLocalSyncClient'
import '../hardReset'

/**
 * This is a temporary solution that will be replaced with the remote sync client once it has the db
 * integrated
 *
 * @public
 */
export function useLocalSyncClient({
	universalPersistenceKey,
	store,
}: {
	universalPersistenceKey?: string
	store: TLStore
}): SyncedStore {
	const [state, setState] = useState<{ id: string; syncedStore: SyncedStore } | null>(null)
	useEffect(() => {
		const id = uniqueId()

		if (!universalPersistenceKey) {
			setState({
				id,
				syncedStore: { store, status: 'not-synced' },
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
			universalPersistenceKey,
			onLoad() {
				setSyncedStore({ status: 'synced', store })
			},
			onLoadError(err) {
				setSyncedStore({ status: 'error', error: err })
			},
		})

		return () => {
			setState((prevState) => (prevState?.id === id ? null : prevState))
			client.close()
		}
	}, [universalPersistenceKey, store])

	return state?.syncedStore ?? { status: 'loading' }
}
