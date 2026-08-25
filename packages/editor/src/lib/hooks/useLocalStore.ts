import { TLAssetId, TLAssetStore, TLStoreSnapshot } from '@tldraw/tlschema'
import { noop } from '@tldraw/utils'
import { useEffect } from 'react'
import { TLStoreOptions, createTLStore } from '../config/createTLStore'
import { TLEditorSnapshot } from '../config/TLEditorSnapshot'
import { TLStoreWithStatus } from '../utils/sync/StoreWithStatus'
import type { TLLocalSyncClient } from '../utils/sync/TLLocalSyncClient'
import { useShallowObjectIdentity } from './useIdentity'
import { useRefState } from './useRefState'

/** @internal */
export function useLocalStore(
	options: {
		persistenceKey?: string
		sessionId?: string
		snapshot?: TLEditorSnapshot | TLStoreSnapshot
	} & TLStoreOptions
): TLStoreWithStatus {
	const [state, setState] = useRefState<TLStoreWithStatus>({ status: 'loading' })

	options = useShallowObjectIdentity(options)

	useEffect(() => {
		const { persistenceKey, sessionId, ...rest } = options

		if (!persistenceKey) {
			setState({
				status: 'not-synced',
				store: createTLStore(rest),
			})
			return
		}

		setState({ status: 'loading' })

		// Keyed by asset id rather than record identity so that a record update doesn't mint
		// another object url for the same blob; every url minted here is revoked on cleanup.
		const objectURLCache = new Map<TLAssetId, Promise<string | null>>()
		const assets: TLAssetStore = {
			upload: async (asset, file) => {
				const client = await clientPromise
				await client.db.storeAsset(asset.id, file)
				return { src: asset.id }
			},
			resolve: async (asset) => {
				if (!asset.props.src) return null

				if (asset.props.src.startsWith('asset:')) {
					let objectURL = objectURLCache.get(asset.id)
					if (!objectURL) {
						objectURL = clientPromise
							.then((client) => client.db.getAsset(asset.id))
							.then((blob) => (blob ? URL.createObjectURL(blob) : null))
						objectURLCache.set(asset.id, objectURL)
					}
					return await objectURL
				}

				return asset.props.src
			},
			remove: async (assetIds) => {
				const client = await clientPromise
				await client.db.removeAssets(assetIds)
			},
			...rest.assets,
		}

		const store = createTLStore({ ...rest, assets })

		let isClosed = false

		// The IndexedDB client (and the idb library under it) is only needed when a persistence key
		// is set, so consumers that never persist locally don't ship it. The store stays in the
		// 'loading' state until the client has loaded anyway, so the extra await is invisible.
		const clientPromise: Promise<TLLocalSyncClient> =
			import('../utils/sync/TLLocalSyncClient').then(
				({ TLLocalSyncClient }) =>
					new TLLocalSyncClient(store, {
						sessionId,
						persistenceKey,
						onLoad() {
							if (isClosed) return
							setState({ store, status: 'synced-local' })
						},
						onLoadError(err: any) {
							if (isClosed) return
							setState({ status: 'error', error: err })
						},
					})
			)
		clientPromise.catch((err) => {
			if (isClosed) return
			setState({ status: 'error', error: err })
		})

		return () => {
			isClosed = true
			clientPromise.then((client) => client.close(), noop)
			for (const objectURL of objectURLCache.values()) {
				objectURL.then((url) => url && URL.revokeObjectURL(url), noop)
			}
		}
	}, [options, setState])

	return state
}
