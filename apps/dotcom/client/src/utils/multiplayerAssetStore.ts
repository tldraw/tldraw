import { MediaHelpers, TLAssetStore, clamp, fetch, uniqueId } from 'tldraw'
import { loadLocalFile } from '../tla/utils/slurping'
import { USER_CONTENT_URL } from './config'
import { isDevelopmentEnv, isPreviewEnv } from './env'

// Assets are uploaded to and served from a separate tldrawusercontent worker (USER_CONTENT_URL).
// Same R2 bucket as before — the worker just adds auth gating and Cloudflare Image Transformations.
// For app files, a fileId query param triggers server-side write-access validation and DB association.
async function getUrl(file: File, fileId: string | undefined) {
	const id = uniqueId()

	const objectName = `${id}-${file.name}`.replace(/\W/g, '-')
	const url = `${USER_CONTENT_URL}/${objectName}`
	if (fileId) {
		return {
			fetchUrl: `${url}?${new URLSearchParams({ fileId }).toString()}`,
			src: url,
		}
	}
	return { fetchUrl: url, src: url }
}

export function multiplayerAssetStore(opts?: {
	getFileId?(): string
	getToken?(): Promise<string | undefined>
}) {
	const { getFileId, getToken } = opts ?? {}
	return {
		upload: async (_asset, file, abortSignal?) => {
			const fileId = getFileId?.()
			const { fetchUrl, src } = await getUrl(file, fileId)
			const headers: Record<string, string> = {}
			if (fileId && getToken) {
				const token = await getToken()
				if (token && token !== 'not-logged-in') {
					headers['Authorization'] = `Bearer ${token}`
				}
			}
			const response = await fetch(fetchUrl, {
				method: 'POST',
				body: file,
				signal: abortSignal,
				headers,
			})

			if (!response.ok) {
				throw new Error(`Failed to upload asset: ${response.statusText}`)
			}

			if (fileId) {
				const meta = { fileId }
				return { src, meta }
			}
			return { src }
		},

		async resolve(asset, context) {
			if (!asset.props.src) return null

			if (asset.props.src.startsWith('asset:')) {
				if (!asset.meta.hidden) {
					const res = await loadLocalFile(asset)
					if (res) {
						return res.url
					}
				} else {
					return asset.props.src
				}
			}

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

			// Assets that are under a certain file size aren't worth resizing.
			// We still send them through image optimization for format conversion.
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

				return `${USER_CONTENT_URL}/cdn-cgi/image/w=${width},format=auto/${objectName}`
			}

			return `${USER_CONTENT_URL}/cdn-cgi/image/format=auto/${objectName}`
		},
	} satisfies TLAssetStore
}
