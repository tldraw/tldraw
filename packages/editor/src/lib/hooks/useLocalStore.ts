import { StoreSnapshot } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { useEffect, useState } from 'react'
import { TLStoreOptions } from '../config/createTLStore'
import { TLStoreWithStatus } from '../utils/sync/StoreWithStatus'
import { TLLocalSyncClient } from '../utils/sync/TLLocalSyncClient'
import { uniqueId } from '../utils/uniqueId'
import { useTLStore } from './useTLStore'

/** @internal */
export function useLocalStore({
	persistenceKey,
	sessionId,
	...rest
}: {
	persistenceKey?: string
	sessionId?: string
	snapshot?: StoreSnapshot<TLRecord>
} & TLStoreOptions): TLStoreWithStatus {
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

		const client = new TLLocalSyncClient(store, {
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
