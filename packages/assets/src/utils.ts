/** @public */
export type AssetUrl = string | { src: string }

/** @public */
export type AssetUrlOptions = {
	baseUrl?: string
}

/** @public */
export function formatAssetUrl(assetUrl: AssetUrl, { baseUrl = '' }: AssetUrlOptions = {}): string {
	const assetUrlString = typeof assetUrl === 'string' ? assetUrl : assetUrl.src

	if (assetUrlString.startsWith('data:')) return assetUrlString

	return `${baseUrl.replace(/\/$/, '')}/${assetUrlString.replace(/^\.?\//, '')}`
}
