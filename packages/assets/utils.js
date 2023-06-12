// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./modules.d.ts" />

/**
 * @param {AssetUrl} assetUrl
 * @param {AssetUrlOptions} [format]
 * @returns {string}
 */
export function formatAssetUrl(assetUrl, format = {}) {
	const assetUrlString = typeof assetUrl === 'string' ? assetUrl : assetUrl.src

	if (typeof format === 'function') return format(assetUrlString)

	const { baseUrl = '' } = format

	if (assetUrlString.startsWith('data:')) return assetUrlString
	if (assetUrlString.match(/^https?:\/\//)) return assetUrlString

	return `${baseUrl.replace(/\/$/, '')}/${assetUrlString.replace(/^\.?\//, '')}`
}
