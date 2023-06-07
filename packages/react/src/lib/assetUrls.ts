/** @public */
export type TLEditorAssetUrls = {
	fonts: {
		monospace: string
		serif: string
		sansSerif: string
		draw: string
	}
}

/** @public */
export let defaultEditorAssetUrls: TLEditorAssetUrls = {
	fonts: {
		draw: '/fonts/Shantell_Sans-Normal-SemiBold.woff2',
		serif: '/fonts/IBMPlexSerif-Medium.woff2',
		sansSerif: '/fonts/IBMPlexSans-Medium.woff2',
		monospace: '/fonts/IBMPlexMono-Medium.woff2',
	},
}

/** @internal */
export function setDefaultEditorAssetUrls(assetUrls: TLEditorAssetUrls) {
	defaultEditorAssetUrls = assetUrls
}
