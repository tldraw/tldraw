import { SyncedStore, TldrawEditorConfig, TLInstanceId, uniqueId } from '@tldraw/editor'
import { useEffect, useState } from 'react'
import '../hardReset'
import { TLLocalSyncClient } from '../TLLocalSyncClient'

/**
 * This is a temporary solution that will be replaced with the remote sync client once it has the db
 * integrated
 *
 * @public
 */
export function useLocalSyncClient({
	universalPersistenceKey,
	instanceId,
	config,
}: {
	universalPersistenceKey: string
	instanceId: TLInstanceId
	config: TldrawEditorConfig
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

		const store = config.createStore({ instanceId })

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
	}, [instanceId, universalPersistenceKey, config])

	return state?.syncedStore ?? { status: 'loading' }
}
