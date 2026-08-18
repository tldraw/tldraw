import { useCallback, useMemo } from 'react'
import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetStore,
	TLPresenceStateInfo,
	TLStore,
	TLStoreSchemaOptions,
	TLUser,
	TLUserStore,
	clamp,
	defaultBindingUtils,
	defaultShapeUtils,
	getHashForString,
	uniqueId,
	useShallowObjectIdentity,
} from 'tldraw'
import { RemoteTLStoreWithStatus, useSync } from './useSync'

/** @public */
export interface UseSyncDemoOptions {
	/**
	 * The room ID to sync with. Make sure the room ID is unique. The namespace is shared by
	 * everyone using the demo server. Consider prefixing it with your company or project name.
	 */
	roomId: string

	/**
	 * User store for identity, presence and attribution.
	 * If not provided, a default implementation based on localStorage will be used.
	 */
	users?: TLUserStore

	/** @internal */
	host?: string

	/**
	 * {@inheritdoc UseSyncOptions.getUserPresence}
	 * @public
	 */
	getUserPresence?(store: TLStore, user: TLUser): TLPresenceStateInfo | null
}

// Bundlers often inline `process.env.X` by string replacement rather than providing a
// runtime `process`, so a `typeof process` guard would defeat them; a try/catch does not.
function getEnv(cb: () => string | undefined): string | undefined {
	try {
		return cb()
	} catch {
		return undefined
	}
}

const DEMO_WORKER = getEnv(() => process.env.TLDRAW_BEMO_URL) ?? 'https://demo.tldraw.xyz'
const IMAGE_WORKER = getEnv(() => process.env.TLDRAW_IMAGE_URL) ?? 'https://images.tldraw.xyz'

/**
 * Creates a tldraw store synced with a multiplayer room hosted on tldraw's demo server `https://demo.tldraw.xyz`.
 *
 * The store can be passed directly into the `<Tldraw />` component to enable multiplayer features.
 * It will handle loading states, and enable multiplayer UX like user cursors and following.
 *
 * All data on the demo server is
 *
 * - Deleted after a day or so.
 * - Publicly accessible to anyone who knows the room ID. Use your company name as a prefix to help avoid collisions, or generate UUIDs for maximum privacy.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *     const store = useSyncDemo({roomId: 'my-app-test-room'})
 *     return <Tldraw store={store} />
 * }
 * ```
 *
 * @param options - Options for the multiplayer demo sync store. See {@link UseSyncDemoOptions} and {@link @tldraw/editor#TLStoreSchemaOptions}.
 *
 * @public
 */
export function useSyncDemo(
	options: UseSyncDemoOptions & TLStoreSchemaOptions
): RemoteTLStoreWithStatus {
	const { roomId, host = DEMO_WORKER, ..._syncOpts } = options
	const assets = useMemo(() => createDemoAssetStore(host), [host])

	const syncOpts = useShallowObjectIdentity(_syncOpts)
	const syncOptsWithDefaults = useMemo(() => {
		if ('schema' in syncOpts && syncOpts.schema) return syncOpts

		return {
			...syncOpts,
			shapeUtils:
				'shapeUtils' in syncOpts
					? [...defaultShapeUtils, ...(syncOpts.shapeUtils ?? [])]
					: defaultShapeUtils,
			bindingUtils:
				'bindingUtils' in syncOpts
					? [...defaultBindingUtils, ...(syncOpts.bindingUtils ?? [])]
					: defaultBindingUtils,
		}
	}, [syncOpts])

	return useSync({
		uri: `${host}/connect/${encodeURIComponent(roomId)}`,
		roomId,
		assets,
		onMount: useCallback(
			(editor: Editor) => {
				editor.registerExternalAssetHandler('url', ({ url }) =>
					createAssetFromUrlUsingDemoServer(host, url)
				)
			},
			[host]
		),
		...syncOptsWithDefaults,
	})
}

// Uploads from production tldraw domains would let the demo server be abused.
function shouldDisallowUploads(host: string) {
	const disallowedHosts = ['tldraw.com', 'tldraw.xyz']
	return disallowedHosts.some(
		(disallowedHost) => host === disallowedHost || host.endsWith(`.${disallowedHost}`)
	)
}

function createDemoAssetStore(host: string): TLAssetStore {
	return {
		upload: async (_asset, file) => {
			if (shouldDisallowUploads(host)) {
				alert('Uploading images is disabled in this demo.')
				throw new Error('Uploading images is disabled in this demo.')
			}
			const objectName = `${uniqueId()}-${file.name}`.replace(/\W/g, '-')
			const url = `${host}/uploads/${objectName}`
			await fetch(url, { method: 'POST', body: file })
			return { src: url }
		},

		resolve(asset, context) {
			const { src } = asset.props
			if (!src) return null

			// We don't deal with videos at the moment.
			if (asset.type === 'video') return src
			if (asset.type !== 'image') return null

			// Don't try to transform data: URLs, yikes.
			if (!src.startsWith('http:') && !src.startsWith('https:')) return src
			if (context.shouldResolveToOriginal) return src

			// Don't try to transform animated or vector images.
			if (MediaHelpers.isAnimatedImageType(asset.props.mimeType) || asset.props.isAnimated)
				return src
			if (MediaHelpers.isVectorImageType(asset.props.mimeType)) return src

			const url = new URL(src)

			// we only transform images that are hosted on domains we control
			const isTldrawImage =
				url.origin === host || /\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host)
			if (!isTldrawImage) return src

			// Assets that are under a certain file size aren't worth transforming (and incurring cost).
			// We still send them through the image worker to get them optimized though.
			const { fileSize = 0 } = asset.props
			const isWorthResizing = fileSize >= 1024 * 1024 * 1.5

			if (isWorthResizing) {
				// N.B. navigator.connection is only available in certain browsers (mainly Blink-based browsers)
				// 4g is as high the 'effectiveType' goes and we can pick a lower effective image quality for slower connections.
				const networkCompensation =
					!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

				const pixelRatio = asset.props.pixelRatio ?? 1
				const trueWidth = asset.props.w * pixelRatio
				const width = Math.ceil(
					Math.min(
						trueWidth *
							clamp(context.steppedScreenScale, 1 / 32, 1) *
							networkCompensation *
							context.dpr,
						trueWidth
					)
				)

				url.searchParams.set('w', width.toString())
			}

			return `${IMAGE_WORKER}/${url.host}/${url.toString().slice(url.origin.length + 1)}`
		},
	}
}

async function createAssetFromUrlUsingDemoServer(host: string, url: string): Promise<TLAsset> {
	let meta: { description?: string; image?: string; favicon?: string; title?: string } | null = null
	try {
		const fetchUrl = new URL(`${host}/bookmarks/unfurl`)
		fetchUrl.searchParams.set('url', url)
		meta = await (await fetch(fetchUrl, { method: 'POST' })).json()
	} catch (error) {
		// Fall back to a blank bookmark
		console.error(error)
	}

	return {
		id: AssetRecordType.createId(getHashForString(url)),
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
}
