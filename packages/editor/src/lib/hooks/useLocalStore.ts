import { useEffect, useState } from 'react'
import { StoreOptions } from '../config/createTLStore'
import { uniqueId } from '../utils/data'
import { StoreWithStatus } from '../utils/sync/StoreWithStatus'
import { TLLocalSyncClient } from '../utils/sync/TLLocalSyncClient'
import { useTLStore } from './useTLStore'

/** @internal */
export function useLocalStore(
	opts = {} as { persistenceKey?: string } & StoreOptions
): StoreWithStatus {
	const { persistenceKey, ...rest } = opts

	const [state, setState] = useState<{ id: string; storeWithStatus: StoreWithStatus } | null>(null)
	const store = useTLStore(rest)

	useEffect(() => {
		const id = uniqueId()

		if (!persistenceKey) {
			setState({
				id,
				storeWithStatus: { status: 'not-synced', store },
			})
			return
		}

		setState({
			id,
			storeWithStatus: { status: 'loading' },
		})

		const setStoreWithStatus = (storeWithStatus: StoreWithStatus) => {
			setState((prev) => {
				if (prev?.id === id) {
					return { id, storeWithStatus }
				}
				return prev
			})
		}

		const client = new TLLocalSyncClient(store, {
			universalPersistenceKey: persistenceKey,
			onLoad() {
				setStoreWithStatus({ store, status: 'synced-local' })
			},
			onLoadError(err: any) {
				setStoreWithStatus({ status: 'error', error: err })
			},
		})

		return () => {
			setState((prevState) => (prevState?.id === id ? null : prevState))
			client.close()
		}
	}, [persistenceKey, store])

	return state?.storeWithStatus ?? { status: 'loading' }
}
