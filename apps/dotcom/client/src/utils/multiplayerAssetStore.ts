import { MediaHelpers, TLAssetStore, fetch, uniqueId } from 'tldraw'
import { loadLocalFile } from '../tla/utils/slurping'
import { APP_ASSET_UPLOAD_URL, ASSET_UPLOADER_URL, IMAGE_WORKER } from './config'
import { isDevelopmentEnv } from './env'

interface AppInfo {
	accessToken: string
	fileId: string
}

async function getUrl(file: File, getAppInfo?: () => Promise<AppInfo>) {
	const id = uniqueId()

	const objectName = `${id}-${file.name}`.replace(/\W/g, '-')
	if (!getAppInfo) {
		return `${ASSET_UPLOADER_URL}/uploads/${objectName}`
	}
	const appInfo = await getAppInfo()
	const accessToken = appInfo.accessToken
	const fileId = appInfo.fileId

	return `${APP_ASSET_UPLOAD_URL}/${objectName}?${new URLSearchParams({ accessToken, fileId }).toString()}`
}

export function multiplayerAssetStore(getAppInfo?: () => Promise<AppInfo>) {
	return {
		upload: async (_asset, file, abortSignal?) => {
			const url = await getUrl(file, getAppInfo)
			const response = await fetch(url, {
				method: 'POST',
				body: file,
				signal: abortSignal,
			})

			if (!response.ok) {
				throw new Error(`Failed to upload asset: ${response.statusText}`)
			}

			// we have to strip search params so that we don't expose them
			return url.split('?')[0]
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
						asset.props.w * context.steppedScreenScale * networkCompensation * context.dpr,
						asset.props.w
					)
				)

				url.searchParams.set('w', width.toString())
			}

			const newUrl = `${IMAGE_WORKER}/${url.host}/${url.toString().slice(url.origin.length + 1)}`
			return newUrl
		},
	} satisfies TLAssetStore
}
