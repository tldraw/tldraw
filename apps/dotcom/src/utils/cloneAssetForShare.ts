import { TLAsset, TLImageAsset, TLVideoAsset, structuredClone } from 'tldraw'

export async function cloneAssetForShare(
	asset: TLAsset,
	uploadFiles: {
		image: (files: File[]) => Promise<TLImageAsset>
		video: (file: File) => Promise<TLVideoAsset>
	}
): Promise<TLAsset> {
	if (asset.type === 'bookmark') {
		return asset
	}

	if (asset.type === 'video') {
		const { src } = asset.props
		if (!src) return asset
		const dataUrlMatch = src.match(/data:(.*?)(;base64)?,/)
		if (!dataUrlMatch) return asset
		const response = await fetch(src)
		const file = new File([await response.blob()], asset.props.name, {
			type: dataUrlMatch[1] ?? asset.props.mimeType,
		})
		const uploadedAsset = await uploadFiles.video(file)

		return {
			...asset,
			props: {
				...asset.props,
				src: uploadedAsset.props.src,
			},
		}
	}

	if (asset.type === 'image') {
		const { sources } = asset.props
		const nextSources = structuredClone(sources)
		const files: File[] = []
		for (const source of nextSources) {
			const { src } = source
			if (!src) continue
			const dataUrlMatch = src.match(/data:(.*?)(;base64)?,/)
			if (!dataUrlMatch) continue
			const response = await fetch(src)
			const file = new File([await response.blob()], asset.props.name, {
				type: dataUrlMatch[1] ?? asset.props.mimeType,
			})
			files.push(file)
		}

		const uploadedAsset = await uploadFiles.image(files)

		return {
			...asset,
			props: {
				...asset.props,
				...uploadedAsset.props,
			},
		}
	}

	return asset
}
