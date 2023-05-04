/** @public */
export type AssetUrl = string | { src: string }

/** @public */
export type AssetUrlOptions =
	| {
			baseUrl?: string
	  }
	| ((assetUrl: string) => string)

/** @public */
export function formatAssetUrl(assetUrl: AssetUrl, format: AssetUrlOptions = {}): string {
	const assetUrlString = typeof assetUrl === 'string' ? assetUrl : assetUrl.src

	if (typeof format === 'function') return format(assetUrlString)

	const { baseUrl = '' } = format

	if (assetUrlString.startsWith('data:')) return assetUrlString
	if (assetUrlString.match(/^https?:\/\//)) return assetUrlString

	return `${baseUrl.replace(/\/$/, '')}/${assetUrlString.replace(/^\.?\//, '')}`
}
