import { TLAsset, fetch, getAssetFromIndexedDb } from 'tldraw'
import { createAssetFromFile } from './createAssetFromFile'

export async function cloneAssetForShare(asset: TLAsset, persistenceKey: string): Promise<TLAsset> {
	if (asset.type === 'bookmark') return asset

	if (asset.props.src) {
		let file: File | undefined
		if (asset.props.src.startsWith('asset:')) {
			const blob = await getAssetFromIndexedDb({ assetId: asset.id, persistenceKey })
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

		const uploadedAsset = await createAssetFromFile({ type: 'file', file })

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
