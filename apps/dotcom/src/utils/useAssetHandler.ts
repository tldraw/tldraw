import { AssetContextProps, TLAsset } from 'tldraw'
import { ASSET_UPLOADER_URL } from './config'

export function useAssetHandler() {
	const handleAsset = (asset: TLAsset | null | undefined, context: AssetContextProps) => {
		if (!asset || !asset.props.src) return ''

		// We don't deal with videos at the moment.
		if (asset.type === 'video') return asset.props.src

		// Assert it's an image to make TS happy.
		if (asset.type !== 'image') return ''

		// Don't try to transform data: URLs, yikes.
		if (!asset.props.src.startsWith('http:') && !asset.props.src.startsWith('https:'))
			return asset.props.src

		// N.B. navigator.connection is only available in certain browsers (mainly Blink-based browsers)
		// 4g is as high the 'effectiveType' goes and we can pick a lower effective image quality for slower connections.
		const networkCompensation =
			!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

		// We only look at the zoom level to the nearest 0.25
		const zoomStepFunction = (zoom: number) => Math.floor(zoom * 4) / 4
		const steppedZoom = Math.max(0.25, zoomStepFunction(context.zoom))

		const width = Math.ceil(asset.props.w * steppedZoom * networkCompensation)

		if (process.env.NODE_ENV === 'development') {
			return asset.props.src
		}

		return `${ASSET_UPLOADER_URL}/cdn-cgi/image/width=${width},dpr=${context.dpr},fit=scale-down,quality=92/${asset.props.src}`
	}

	return { handleAsset }
}
