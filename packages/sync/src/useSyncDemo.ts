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

function createDemoAssetStore(host: string): TLAssetStore {
	return {
		upload: async (asset, file) => {
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
