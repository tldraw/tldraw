import { useCallback, useMemo } from 'react'
import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	Signal,
	TLAsset,
	TLAssetStore,
	TLUserPreferences,
	getHashForString,
	uniqueId,
} from 'tldraw'
import { RemoteTLStoreWithStatus, useRemoteSyncClient } from './useRemoteSyncClient'

/** @public */
export interface UseDemoSyncClientConfig {
	roomId: string
	userPreferences?: Signal<TLUserPreferences>
	/** @internal */
	host?: string
}

/**
 * Depending on the environment this package is used in, process.env may not be available. Wrap
 * `process.env` accesses in this to make sure they don't fail.
 *
 * The reason that this is just a try/catch and not a dynamic check e.g. `process &&
 * process.env[key]` is that many bundlers implement `process.env.WHATEVER` using compile-time
 * string replacement, rather than actually creating a runtime implementation of a `process` object.
 */
function getEnv(cb: () => string | undefined): string | undefined {
	try {
		return cb()
	} catch {
		return undefined
	}
}

const DEMO_WORKER = getEnv(() => process.env.DEMO_WORKER) ?? 'https://demo.tldraw.xyz'
const IMAGE_WORKER = getEnv(() => process.env.IMAGE_WORKER) ?? 'https://images.tldraw.xyz'

export function useDemoRemoteSyncClient({
	roomId,
	userPreferences,
	host = DEMO_WORKER,
}: UseDemoSyncClientConfig): RemoteTLStoreWithStatus {
	const assets = useMemo(() => createDemoAssetStore(host), [host])

	return useRemoteSyncClient({
		uri: `${host}/connect/${roomId}`,
		roomId,
		userPreferences,
		assets,
		onConnectEditor: useCallback(
			(editor: Editor) => {
				console.log('onConnectEditor')
				editor.registerExternalAssetHandler('url', async ({ url }) => {
					console.log('url handler', url, host)
					const r = await createAssetFromUrlUsingDemoServer(host, url)
					console.log(r)
					return r
				})
			},
			[host]
		),
	})
}

function createDemoAssetStore(host: string): TLAssetStore {
	return {
		upload: async (asset, file) => {
			const id = uniqueId()

			const objectName = `${id}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
			const url = `${host}/uploads/${objectName}`

			await fetch(url, {
				method: 'POST',
				body: file,
			})

			return url
		},

		resolve(asset, context) {
			if (!asset.props.src) return null

			// We don't deal with videos at the moment.
			if (asset.type === 'video') return asset.props.src

			// Assert it's an image to make TS happy.
			if (asset.type !== 'image') return null

			// Don't try to transform data: URLs, yikes.
			if (!asset.props.src.startsWith('http:') && !asset.props.src.startsWith('https:'))
				return asset.props.src

			if (context.shouldResolveToOriginal) return asset.props.src

			// Don't try to transform animated images.
			if (MediaHelpers.isAnimatedImageType(asset?.props.mimeType) || asset.props.isAnimated)
				return asset.props.src

			// Don't try to transform vector images.
			if (MediaHelpers.isVectorImageType(asset?.props.mimeType)) return asset.props.src

			const url = new URL(asset.props.src)

			// we only transform images that are hosted on domains we control
			const isTldrawImage =
				url.origin === host || /\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host)

			if (!isTldrawImage) return asset.props.src

			// Assets that are under a certain file size aren't worth transforming (and incurring cost).
			// We still send them through the image worker to get them optimized though.
			const isWorthResizing =
				asset.props.fileSize !== -1 && asset.props.fileSize >= 1024 * 1024 * 1.5

			if (isWorthResizing) {
				// N.B. navigator.connection is only available in certain browsers (mainly Blink-based browsers)
				// 4g is as high the 'effectiveType' goes and we can pick a lower effective image quality for slower connections.
				const networkCompensation =
					!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

				const width = Math.ceil(
					Math.min(
						asset.props.w * context.steppedScreenScale * networkCompensation * context.dpr,
						asset.props.w
					)
				)

				url.searchParams.set('w', width.toString())
			}

			const newUrl = `${IMAGE_WORKER}/${url.host}/${url.toString().slice(url.origin.length + 1)}`
			return newUrl
		},
	}
}

async function createAssetFromUrlUsingDemoServer(host: string, url: string): Promise<TLAsset> {
	const urlHash = getHashForString(url)
	try {
		// First, try to get the meta data from our endpoint
		const fetchUrl = new URL(`${host}/bookmarks/unfurl`)
		fetchUrl.searchParams.set('url', url)

		const meta = (await (await fetch(fetchUrl)).json()) as {
			description?: string
			image?: string
			favicon?: string
			title?: string
		} | null

		return {
			id: AssetRecordType.createId(urlHash),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				description: meta?.description ?? '',
				image: meta?.image ?? '',
				favicon: meta?.favicon ?? '',
				title: meta?.title ?? '',
			},
			meta: {},
		}
	} catch (error) {
		// Otherwise, fallback to a blank bookmark
		console.error(error)
		return {
			id: AssetRecordType.createId(urlHash),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				description: '',
				image: '',
				favicon: '',
				title: '',
			},
			meta: {},
		}
	}
}
