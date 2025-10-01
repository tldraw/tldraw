import { useCallback, useMemo } from 'react'
import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	Signal,
	TLAsset,
	TLAssetStore,
	TLPresenceStateInfo,
	TLPresenceUserInfo,
	TLStore,
	TLStoreSchemaOptions,
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
	 * A signal that contains the user information needed for multiplayer features.
	 * This should be synchronized with the `userPreferences` configuration for the main `<Tldraw />` component.
	 * If not provided, a default implementation based on localStorage will be used.
	 */
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo>

	/** @internal */
	host?: string

	/**
	 * {@inheritdoc UseSyncOptions.getUserPresence}
	 * @public
	 */
	getUserPresence?(store: TLStore, user: TLPresenceUserInfo): TLPresenceStateInfo | null
}

/**
 * Safely accesses environment variables across different bundling environments.
 *
 * Depending on the environment this package is used in, process.env may not be available. This function
 * wraps `process.env` accesses in a try/catch to prevent runtime errors in environments where process
 * is not defined.
 *
 * The reason that this is just a try/catch and not a dynamic check e.g. `process &&
 * process.env[key]` is that many bundlers implement `process.env.WHATEVER` using compile-time
 * string replacement, rather than actually creating a runtime implementation of a `process` object.
 *
 * @param cb - Callback function that accesses an environment variable
 * @returns The environment variable value if available, otherwise undefined
 * @internal
 */
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
 * @param options - Options for the multiplayer demo sync store. See {@link UseSyncDemoOptions} and {@link tldraw#TLStoreSchemaOptions}.
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
				editor.registerExternalAssetHandler('url', async ({ url }) => {
					return await createAssetFromUrlUsingDemoServer(host, url)
				})
			},
			[host]
		),
		...syncOptsWithDefaults,
	})
}

/**
 * Determines whether file uploads should be disabled for a given host.
 *
 * Uploads are disabled for production tldraw domains to prevent abuse of the demo server
 * infrastructure. This includes tldraw.com and tldraw.xyz domains and their subdomains.
 *
 * @param host - The host URL to check for upload restrictions
 * @returns True if uploads should be disabled, false otherwise
 * @internal
 */
function shouldDisallowUploads(host: string) {
	const disallowedHosts = ['tldraw.com', 'tldraw.xyz']
	return disallowedHosts.some(
		(disallowedHost) => host === disallowedHost || host.endsWith(`.${disallowedHost}`)
	)
}

/**
 * Creates an asset store implementation optimized for the tldraw demo server.
 *
 * This asset store handles file uploads to the demo server and provides intelligent
 * asset resolution with automatic image optimization based on network conditions,
 * screen density, and display size. It includes safeguards to prevent uploads to
 * production domains and optimizes images through the tldraw image processing service.
 *
 * @param host - The demo server host URL for file uploads and asset resolution
 * @returns A TLAssetStore implementation with upload and resolve capabilities
 * @example
 * ```ts
 * const assetStore = createDemoAssetStore('https://demo.tldraw.xyz')
 *
 * // Upload a file
 * const result = await assetStore.upload(asset, file)
 * console.log('Uploaded to:', result.src)
 *
 * // Resolve optimized asset URL
 * const optimizedUrl = assetStore.resolve(imageAsset, {
 *   steppedScreenScale: 1.5,
 *   dpr: 2,
 *   networkEffectiveType: '4g'
 * })
 * ```
 * @internal
 */
function createDemoAssetStore(host: string): TLAssetStore {
	return {
		upload: async (_asset, file) => {
			if (shouldDisallowUploads(host)) {
				alert('Uploading images is disabled in this demo.')
				throw new Error('Uploading images is disabled in this demo.')
			}
			const id = uniqueId()

			const objectName = `${id}-${file.name}`.replace(/\W/g, '-')
			const url = `${host}/uploads/${objectName}`

			await fetch(url, {
				method: 'POST',
				body: file,
			})

			return { src: url }
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
			const { fileSize = 0 } = asset.props
			const isWorthResizing = fileSize >= 1024 * 1024 * 1.5

			if (isWorthResizing) {
				// N.B. navigator.connection is only available in certain browsers (mainly Blink-based browsers)
				// 4g is as high the 'effectiveType' goes and we can pick a lower effective image quality for slower connections.
				const networkCompensation =
					!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

				const width = Math.ceil(
					Math.min(
						asset.props.w *
							clamp(context.steppedScreenScale, 1 / 32, 1) *
							networkCompensation *
							context.dpr,
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

/**
 * Creates a bookmark asset by fetching metadata from a URL using the demo server.
 *
 * This function uses the demo server's bookmark unfurling service to extract metadata
 * like title, description, favicon, and preview image from a given URL. If the metadata
 * fetch fails, it returns a blank bookmark asset with just the URL.
 *
 * @param host - The demo server host URL to use for bookmark unfurling
 * @param url - The URL to create a bookmark asset from
 * @returns A promise that resolves to a TLAsset of type 'bookmark' with extracted metadata
 * @example
 * ```ts
 * const asset = await createAssetFromUrlUsingDemoServer(
 *   'https://demo.tldraw.xyz',
 *   'https://example.com'
 * )
 *
 * console.log(asset.props.title) // "Example Domain"
 * console.log(asset.props.description) // "This domain is for use in illustrative examples..."
 * ```
 * @internal
 */
async function createAssetFromUrlUsingDemoServer(host: string, url: string): Promise<TLAsset> {
	const urlHash = getHashForString(url)
	try {
		// First, try to get the meta data from our endpoint
		const fetchUrl = new URL(`${host}/bookmarks/unfurl`)
		fetchUrl.searchParams.set('url', url)

		const meta = (await (await fetch(fetchUrl, { method: 'POST' })).json()) as {
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
