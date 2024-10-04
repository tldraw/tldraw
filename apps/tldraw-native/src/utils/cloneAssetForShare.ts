import { Editor, TLAsset, fetch } from 'tldraw'
import { multiplayerAssetStore } from './multiplayerAssetStore'

export async function cloneAssetForShare(editor: Editor, asset: TLAsset): Promise<TLAsset> {
	if (asset.type === 'bookmark') return asset

	const src = await editor.resolveAssetUrl(asset.id, { shouldResolveToOriginal: true })

	if (src && !(src.startsWith('http:') || src.startsWith('https:'))) {
		const response = await fetch(src)
		const blob = await response.blob()
		const file = new File([blob], asset.props.name, {
			type: blob.type,
		})

		const uploadedAsset = await multiplayerAssetStore.upload(asset, file)

		return {
			...asset,
			props: {
				...asset.props,
				src: uploadedAsset,
			},
		}
	}

	return asset
}
