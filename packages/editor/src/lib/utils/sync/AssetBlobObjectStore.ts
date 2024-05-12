import { TLAsset } from '@tldraw/tlschema'
import { getAssetFromIndexedDb, storeAssetInIndexedDb } from './indexedDb'

export class AssetBlobObjectStore {
	constructor(public persistenceKey: string) {}

	async getAssetBlobFromObjectStore({ asset }: { asset: TLAsset }): Promise<Blob | undefined> {
		return await getAssetFromIndexedDb({ persistenceKey: this.persistenceKey, assetId: asset.id })
	}

	async putAssetBlobInObjectStore({ asset, assetBlob }: { asset: TLAsset; assetBlob: Blob }) {
		await storeAssetInIndexedDb({
			persistenceKey: this.persistenceKey,
			assetId: asset.id,
			assetBlob,
		})
	}
}
