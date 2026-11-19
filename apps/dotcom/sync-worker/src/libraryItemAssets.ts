import { AssetToReplace, collectAssetAssociationChanges } from './assetAssociation'
import { R2ConnectionQueue } from './libraryStorage'
import { Environment } from './types'

/** Library item content as stored: a TLLibraryItemContent, read only as far as its assets. */
export interface StoredItemContent {
	formatVersion: 1
	content: { assets?: unknown[]; [key: string]: unknown }
}

/**
 * The copies an item gets of the uploaded files its content refers to, so deleting the board it was
 * saved from can't break it: the uploads, and the names of their copies, are the ones a board's
 * asset association pass would copy (see collectAssetAssociationChanges). Named before anything is
 * stored, so a caller can queue their cleanup first.
 */
export function planItemAssetCopies(
	env: Environment,
	stored: StoredItemContent,
	itemId: string
): AssetToReplace[] {
	const assets = stored.content.assets ?? []
	const userContentUrl = env.USER_CONTENT_URL
	if (assets.length === 0 || !userContentUrl) return []
	return collectAssetAssociationChanges(assets, { slug: itemId, userContentUrl }).assetsToReplace
}

/**
 * Makes the copies planItemAssetCopies planned. Each asset's src is pointed at its copy and its
 * `fileId` is dropped, so a board the item is placed on makes a copy of its own. An asset whose
 * object is missing is left as it was, and its copy isn't made.
 *
 * Returns the content to store and the names of the planned copies it didn't make.
 */
export async function copyItemAssets(
	env: Environment,
	r2: R2ConnectionQueue,
	stored: StoredItemContent,
	copies: AssetToReplace[]
): Promise<{ content: StoredItemContent; skippedObjectNames: string[] }> {
	if (copies.length === 0) return { content: stored, skippedObjectNames: [] }
	const newSrcByAssetId = new Map<string, string>()
	const skippedObjectNames: string[] = []
	for (const asset of copies) {
		const copied = await r2.run(2, async () => {
			const object = await env.UPLOADS.get(asset.objectName)
			if (!object) return false
			await env.UPLOADS.put(asset.newObjectName, object.body, {
				httpMetadata: object.httpMetadata,
			})
			return true
		})
		if (!copied) {
			skippedObjectNames.push(asset.newObjectName)
			continue
		}
		newSrcByAssetId.set(asset.assetId, asset.newSrc)
	}

	const content = {
		...stored,
		content: {
			...stored.content,
			assets: (stored.content.assets ?? []).map((record) => {
				const asset = record as { id: string; props: object; meta?: Record<string, unknown> }
				const newSrc = newSrcByAssetId.get(asset.id)
				if (!newSrc) return record
				const { fileId: _, ...meta } = asset.meta ?? {}
				return { ...asset, props: { ...asset.props, src: newSrc }, meta }
			}),
		},
	}
	return { content, skippedObjectNames }
}
