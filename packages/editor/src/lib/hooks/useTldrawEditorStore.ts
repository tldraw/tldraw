import { useEffect, useState } from 'react'
import {
	TldrawEditorStore,
	TldrawEditorStoreOptions,
	createTldrawEditorStore,
} from '../config/createTldrawEditorStore'
import '../hardReset'
import { uniqueId } from '../utils/data'
import { TLLocalSyncClient } from '../utils/sync/TLLocalSyncClient'

/** @public */
export function useTldrawEditorStore(
	opts = {} as { persistenceKey?: string } & TldrawEditorStoreOptions
): TldrawEditorStore {
	const { persistenceKey, ...rest } = opts

	const [state, setState] = useState<{ id: string; syncedStore: TldrawEditorStore } | null>(null)
	const [store] = useState(() => createTldrawEditorStore(rest))

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

		const setSyncedStore = (syncedStore: TldrawEditorStore) => {
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
				setSyncedStore({ store, status: 'synced' })
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
