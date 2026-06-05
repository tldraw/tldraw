import { TLAssetUtilConstructor } from '../editor/assets/AssetUtil'

/** @public */
export type TLAnyAssetUtilConstructor = TLAssetUtilConstructor<any>

export function checkAssets(customAssets: readonly TLAnyAssetUtilConstructor[]) {
	const assets = [] as TLAnyAssetUtilConstructor[]

	const addedCustomAssetTypes = new Set<string>()
	for (const customAsset of customAssets) {
		if (addedCustomAssetTypes.has(customAsset.type)) {
			throw new Error(`Asset type "${customAsset.type}" is defined more than once`)
		}
		assets.push(customAsset)
		addedCustomAssetTypes.add(customAsset.type)
	}

	return assets
}
