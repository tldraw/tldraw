import { useEffect, useState } from 'react'
import { TLStoreOptions } from '../config/createTLStore'
import { uniqueId } from '../utils/data'
import { TLStoreWithStatus } from '../utils/sync/StoreWithStatus'
import { useTLStore } from './useTLStore'
import { TLLocalSyncClient2 } from '../utils/sync/TLLocalSyncClient2'

/** @internal */
export function useLocalStore({
	persistenceKey,
	sessionId,
	...rest
}: { persistenceKey?: string; sessionId?: string } & TLStoreOptions): TLStoreWithStatus {
	const [state, setState] = useState<{ id: string; storeWithStatus: TLStoreWithStatus } | null>(
		null
	)
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

		const setStoreWithStatus = (storeWithStatus: TLStoreWithStatus) => {
			setState((prev) => {
				if (prev?.id === id) {
					return { id, storeWithStatus }
				}
				return prev
			})
		}

		const client = new TLLocalSyncClient2(store, {
			sessionId,
			persistenceKey,
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
	}, [persistenceKey, store, sessionId])

	return state?.storeWithStatus ?? { status: 'loading' }
}
