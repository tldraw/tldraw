import { TLAsset } from 'tldraw'

export async function cloneAssetForShare(
	asset: TLAsset,
	uploadFileToAsset: (file: File) => Promise<TLAsset>
): Promise<TLAsset> {
	if (asset.type === 'bookmark') return asset
	if (asset.props.src) {
		const dataUrlMatch = asset.props.src.match(/data:(.*?)(;base64)?,/)
		if (!dataUrlMatch) return asset

		const response = await fetch(asset.props.src)
		const file = new File([await response.blob()], asset.props.name, {
			type: dataUrlMatch[1] ?? asset.props.mimeType,
		})

		const uploadedAsset = await uploadFileToAsset(file)

		return {
			...asset,
			props: {
				...asset.props,
				src: uploadedAsset.props.src,
			},
		}
	}
	return asset
}
