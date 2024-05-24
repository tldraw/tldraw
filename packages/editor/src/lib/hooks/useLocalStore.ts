import { TLStoreSnapshot } from '@tldraw/tlschema'
import { useEffect, useRef, useState } from 'react'
import { TLEditorSnapshot, loadSnapshot } from '../config/TLEditorSnapshot'
import { TLStoreOptions } from '../config/createTLStore'
import { TLSnapshotWithStatus } from '../utils/sync/SnapshotWithStatus'
import { TLStoreWithStatus } from '../utils/sync/StoreWithStatus'
import { TLLocalSyncClient } from '../utils/sync/TLLocalSyncClient'
import { uniqueId } from '../utils/uniqueId'
import { useTLStore } from './useTLStore'

/** @internal */
export function useLocalStore({
	persistenceKey,
	sessionId,
	snapshot,
	...rest
}: {
	persistenceKey?: string
	sessionId?: string
	snapshot?: TLSnapshotWithStatus | TLEditorSnapshot | TLStoreSnapshot
} & TLStoreOptions): TLStoreWithStatus {
	const [state, setState] = useState<{ id: string; storeWithStatus: TLStoreWithStatus } | null>(
		null
	)
	const store = useTLStore(rest)
	const didLoadSnapshot = useRef(false)

	useEffect(() => {
		const id = uniqueId()

		// wait for snapshot to load if there is a snapshot
		if (snapshot && !didLoadSnapshot.current) {
			if ('status' in snapshot) {
				if (snapshot.status === 'ready') {
					loadSnapshot(store, snapshot.snapshot)
					didLoadSnapshot.current = true
				} else {
					setState({
						id,
						storeWithStatus: { status: 'loading' },
					})
					return
				}
			} else {
				loadSnapshot(store, snapshot)
				didLoadSnapshot.current = true
			}
		}

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
	}, [persistenceKey, store, sessionId, snapshot])

	return state?.storeWithStatus ?? { status: 'loading' }
}
