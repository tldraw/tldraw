import {
	AssetContextProps,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	WeakCache,
	getAssetFromIndexedDb,
} from 'tldraw'
import { IMAGE_WORKER } from './config'
import { isDevelopmentEnv } from './env'

const objectURLCache = new WeakCache<TLAsset, ReturnType<typeof getLocalAssetObjectURL>>()

export const resolveAsset =
	(persistenceKey?: string) =>
	async (asset: TLAsset | null | undefined, context: AssetContextProps) => {
		if (!asset || !asset.props.src) return null

		// Retrieve a local image from the DB.
		if (persistenceKey && asset.props.src.startsWith('asset:')) {
			return await objectURLCache.get(
				asset,
				async () => await getLocalAssetObjectURL(persistenceKey, asset.id)
			)
		}

		// We don't deal with videos at the moment.
		if (asset.type === 'video') return asset.props.src

		// Assert it's an image to make TS happy.
		if (asset.type !== 'image') return null

		// Don't try to transform data: URLs, yikes.
		if (!asset.props.src.startsWith('http:') && !asset.props.src.startsWith('https:'))
			return asset.props.src

		if (context.shouldResolveToOriginalImage) {
			return asset.props.src
		}

		// Don't try to transform animated images.
		if (MediaHelpers.isAnimatedImageType(asset?.props.mimeType) || asset.props.isAnimated)
			return asset.props.src

		// Don't try to transform vector images.
		if (MediaHelpers.isVectorImageType(asset?.props.mimeType)) return asset.props.src

		const url = new URL(asset.props.src)

		// we only transform images that are hosted on domains we control
		const isTldrawImage =
			isDevelopmentEnv || /\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host)

		if (!isTldrawImage) return asset.props.src

		// Assets that are under a certain file size aren't worth transforming (and incurring cost).
		// We still send them through the image worker to get them optimized though.
		const isWorthResizing = asset.props.fileSize !== -1 && asset.props.fileSize >= 1024 * 1024 * 1.5

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
	}

async function getLocalAssetObjectURL(persistenceKey: string, assetId: TLAssetId) {
	const blob = await getAssetFromIndexedDb({
		assetId: assetId,
		persistenceKey,
	})
	if (blob) {
		return URL.createObjectURL(blob)
	}
	return null
}
