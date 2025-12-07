import { MediaHelpers, TLAssetStore, clamp, fetch, uniqueId } from 'tldraw'
import { loadLocalFile } from '../tla/utils/slurping'
import { ASSET_UPLOADER_URL, IMAGE_WORKER } from './config'
import { isDevelopmentEnv } from './env'
// This fixes an issue with vitest importing zero
// eslint-disable-next-line local/no-internal-imports
import { APP_ASSET_UPLOAD_ENDPOINT } from '@tldraw/dotcom-shared/src/routes'

async function getUrl(file: File, fileId: string | undefined) {
	const id = uniqueId()

	const objectName = `${id}-${file.name}`.replace(/\W/g, '-')
	if (fileId) {
		const url = `${window.location.origin}${APP_ASSET_UPLOAD_ENDPOINT}${objectName}`
		return {
			fetchUrl: `${url}?${new URLSearchParams({ fileId }).toString()}`,
			src: url,
		}
	}
	const url = `${ASSET_UPLOADER_URL}/uploads/${objectName}`
	return { fetchUrl: url, src: url }
}

export function multiplayerAssetStore(getFileId?: () => string) {
	return {
		upload: async (_asset, file, abortSignal?) => {
			const fileId = getFileId?.()
			const { fetchUrl, src } = await getUrl(file, fileId)
			const response = await fetch(fetchUrl, {
				method: 'POST',
				body: file,
				signal: abortSignal,
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

			// Don't try to transform vector images.
			if (MediaHelpers.isVectorImageType(asset?.props.mimeType)) return asset.props.src

			const url = new URL(asset.props.src)

			// we only transform images that are hosted on domains we control
			const isTldrawImage =
				isDevelopmentEnv || /\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host)

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

			return `${IMAGE_WORKER}/${url.host}/${url.toString().slice(url.origin.length + 1)}`
		},
	} satisfies TLAssetStore
}
