import { AssetContextProps, MediaHelpers, TLAsset } from 'tldraw'
import { ASSET_BUCKET_ORIGIN, ASSET_UPLOADER_URL } from './config'

export async function resolveAsset(asset: TLAsset | null | undefined, context: AssetContextProps) {
	if (!asset || !asset.props.src) return null

	// We don't deal with videos at the moment.
	if (asset.type === 'video') return asset.props.src

	// Assert it's an image to make TS happy.
	if (asset.type !== 'image') return null

	// Don't try to transform data: URLs, yikes.
	if (!asset.props.src.startsWith('http:') && !asset.props.src.startsWith('https:'))
		return asset.props.src

	// Don't try to transform animated images.
	if (MediaHelpers.isAnimatedImageType(asset?.props.mimeType) || asset.props.isAnimated)
		return asset.props.src

	// N.B. navigator.connection is only available in certain browsers (mainly Blink-based browsers)
	// 4g is as high the 'effectiveType' goes and we can pick a lower effective image quality for slower connections.
	const networkCompensation =
		!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

	const width = Math.ceil(asset.props.w * context.steppedScreenScale * networkCompensation)

	if (process.env.NODE_ENV === 'development') {
		return asset.props.src
	}

	// On preview, builds the origin for the asset won't be the right one for the Cloudflare transform.
	const src = asset.props.src.replace(ASSET_UPLOADER_URL, ASSET_BUCKET_ORIGIN)

	return `${ASSET_BUCKET_ORIGIN}/cdn-cgi/image/width=${width},dpr=${context.dpr},fit=scale-down,quality=92/${src}`
}
