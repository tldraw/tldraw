import { TLAsset, TLStoreSnapshot } from '@tldraw/tlschema'
import { WeakCache } from '@tldraw/utils'
import { useEffect, useState } from 'react'
import { TLEditorSnapshot } from '../config/TLEditorSnapshot'
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
	snapshot?: TLEditorSnapshot | TLStoreSnapshot
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

		const objectURLCache = new WeakCache<TLAsset, Promise<string | null>>()

		// TODO(alex): set this when we generate the store instead of passing it in?
		store.props.assets = {
			upload: async (asset, file) => {
				await client.db.storeAsset(asset.id, file)
				return asset.id
			},
			resolve: async (asset) => {
				if (!asset.props.src) return null

				if (asset.props.src.startsWith('asset:')) {
					return await objectURLCache.get(asset, async () => {
						const blob = await client.db.getAsset(asset.id)
						if (!blob) return null
						return URL.createObjectURL(blob)
					})
				}

				return asset.props.src
			},
		}

		return () => {
			setState((prevState) => (prevState?.id === id ? null : prevState))
			client.close()
		}
	}, [persistenceKey, store, sessionId])

	return state?.storeWithStatus ?? { status: 'loading' }
}
