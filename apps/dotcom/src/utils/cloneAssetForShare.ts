import { Editor, TLAsset } from 'tldraw'

export async function cloneAssetForShare(
	asset: TLAsset,
	editor: Editor,
	uploadFileToAsset: (file: File) => Promise<TLAsset>
): Promise<TLAsset> {
	if (asset.type === 'bookmark') return asset

	if (asset.props.src) {
		let file: File | undefined
		if (asset.props.src.startsWith('asset:')) {
			const blob = await editor.getAssetBlobFromObjectStore(asset)
			if (blob) {
				file = new File([blob], asset.props.name, {
					type: asset.props.mimeType || '',
				})
			} else {
				return asset
			}
		} else {
			const dataUrlMatch = asset.props.src.match(/data:(.*?)(;base64)?,/)
			if (!dataUrlMatch) return asset

			const response = await fetch(asset.props.src)
			file = new File([await response.blob()], asset.props.name, {
				type: dataUrlMatch[1] ?? asset.props.mimeType,
			})
		}

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
