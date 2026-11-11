import { MediaHelpers, TLAsset, TLAssetContext, clamp } from 'tldraw'
import { USER_CONTENT_URL } from './config'
import { isDevelopmentEnv, isPreviewEnv } from './env'

const MIN_RESIZE_DIMENSION = 400

// The read half of multiplayerAssetStore, kept apart so the thumbnail render page can resize images
// without pulling in the upload and local-file code.
export function resolveUserContentImageUrl(
	asset: TLAsset,
	context: TLAssetContext,
	{ stillAnimations = false }: { stillAnimations?: boolean } = {}
): string | null {
	if (!asset.props.src) return null

	// We don't deal with videos at the moment.
	if (asset.type === 'video') return asset.props.src

	// Assert it's an image to make TS happy.
	if (asset.type !== 'image') return null

	// Don't try to transform data: URLs, yikes.
	if (!asset.props.src.startsWith('http:') && !asset.props.src.startsWith('https:'))
		return asset.props.src

	if (context.shouldResolveToOriginal) return asset.props.src

	// Resizing an animated image keeps only its first frame (anim=false), so animated images stay
	// original unless the caller only ever draws a still.
	const isAnimated =
		MediaHelpers.isAnimatedImageType(asset?.props.mimeType) || asset.props.isAnimated
	if (isAnimated && !stillAnimations) return asset.props.src

	const url = new URL(asset.props.src)

	// we only transform images that are hosted on domains we control
	const isTldrawImage =
		isDevelopmentEnv ||
		/\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host) ||
		/(?:^|\.)tldrawusercontent\.com$/.test(url.host)

	if (!isTldrawImage) return asset.props.src

	// Extract the objectName (last path segment)
	const objectName = url.pathname.split('/').pop()
	if (!objectName) return asset.props.src

	// /cdn-cgi/image/ is Cloudflare's Image Transformations endpoint:
	// https://developers.cloudflare.com/images/transform-images/transform-via-url/
	// Only works with zone-level setup (production/staging). In dev/preview, serve raw file.
	if (isDevelopmentEnv || isPreviewEnv) {
		return `${USER_CONTENT_URL}/${objectName}`
	}

	const isVector = MediaHelpers.isVectorImageType(asset?.props.mimeType)

	// SVGs are sanitized at upload time by sanitizeSvg(), so we serve them
	// directly without Cloudflare Image Transformations. format=auto would
	// rasterize the SVG, destroying foreignObject/HTML content (e.g. text).
	if (isVector) {
		return `${USER_CONTENT_URL}/${objectName}`
	}

	// Reduce image bandwidth on slow connections; unsupported browsers keep full quality.
	const networkCompensation =
		!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

	const anim = isAnimated ? ',anim=false' : ''
	const pixelRatio = asset.props.pixelRatio ?? 1
	const trueWidth = asset.props.w * pixelRatio
	const width = Math.ceil(
		Math.min(
			trueWidth * clamp(context.steppedScreenScale, 1 / 32, 1) * networkCompensation * context.dpr,
			trueWidth
		)
	)

	// Compressed file size can hide a large decoded bitmap. Avoid near-native resizes
	// so small dimension savings don't create extra CDN variants.
	if (
		trueWidth >= MIN_RESIZE_DIMENSION &&
		asset.props.h * pixelRatio >= MIN_RESIZE_DIMENSION &&
		width < trueWidth * 0.75
	) {
		return `${USER_CONTENT_URL}/cdn-cgi/image/w=${width}${anim},format=auto/${objectName}`
	}

	return `${USER_CONTENT_URL}/cdn-cgi/image/${anim ? 'anim=false,' : ''}format=auto/${objectName}`
}
